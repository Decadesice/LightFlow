use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinking: Option<Thinking>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: serde_json::Value, // 支持字符串或数组（多模态）
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Thinking {
    #[serde(rename = "type")]
    pub thinking_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<Choice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: ResponseMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamChunk {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<StreamChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamChoice {
    pub index: u32,
    pub delta: StreamDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamDelta {
    pub role: Option<String>,
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_content: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamData {
    pub content: Option<String>,
    pub reasoning_content: Option<String>,
    pub done: bool,
}

#[tauri::command]
async fn chat_completions(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<Message>,
    enable_deep_thinking: bool,
) -> Result<ChatResponse, String> {
    let url = format!("{}/chat/completions", base_url);

    let client = reqwest::Client::new();
    let mut request_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });

    // 添加 thinking 参数
    if enable_deep_thinking {
        request_body["thinking"] = serde_json::json!({
            "type": "enabled"
        });
    } else {
        request_body["thinking"] = serde_json::json!({
            "type": "disabled"
        });
    }

    let request_builder = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request_body);

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API Error: {}", error_text));
    }

    let result = response
        .json::<ChatResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

#[tauri::command]
async fn chat_completions_stream(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<Message>,
    enable_deep_thinking: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let url = format!("{}/chat/completions", base_url);

    let client = reqwest::Client::new();
    let mut request_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
    });

    // 添加 thinking 参数
    if enable_deep_thinking {
        request_body["thinking"] = serde_json::json!({
            "type": "enabled"
        });
    } else {
        request_body["thinking"] = serde_json::json!({
            "type": "disabled"
        });
    }

    let request_builder = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request_body);

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API Error: {}", error_text));
    }

    // 读取流式响应
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    // 发送完成事件
                    let _ = app_handle.emit(
                        "stream-chunk",
                        StreamData {
                            content: None,
                            reasoning_content: None,
                            done: true,
                        },
                    );
                    return Ok(());
                }

                if let Ok(json) = serde_json::from_str::<StreamChunk>(data) {
                    if let Some(choice) = json.choices.first() {
                        let stream_data = StreamData {
                            content: choice.delta.content.clone(),
                            reasoning_content: choice.delta.reasoning_content.clone(),
                            done: false,
                        };

                        // 发送流式数据事件
                        let _ = app_handle.emit("stream-chunk", &stream_data);
                    }
                }
            }
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            chat_completions,
            chat_completions_stream
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
