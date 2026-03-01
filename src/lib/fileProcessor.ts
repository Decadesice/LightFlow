/**
 * 文件处理器 - 支持多种格式文件的解析和处理
 */

// 检查是否支持特定文件类型
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    // 图片
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    // 文本
    'text/plain',
    'text/markdown',
    'text/csv',
    // PDF
    'application/pdf',
    // Office 文档
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  return supportedTypes.includes(file.type) || 
         file.name.toLowerCase().endsWith('.jpg') ||
         file.name.toLowerCase().endsWith('.jpeg') ||
         file.name.toLowerCase().endsWith('.png') ||
         file.name.toLowerCase().endsWith('.webp') ||
         file.name.toLowerCase().endsWith('.gif') ||
         file.name.toLowerCase().endsWith('.txt') ||
         file.name.toLowerCase().endsWith('.md') ||
         file.name.toLowerCase().endsWith('.csv') ||
         file.name.toLowerCase().endsWith('.pdf') ||
         file.name.toLowerCase().endsWith('.doc') ||
         file.name.toLowerCase().endsWith('.docx') ||
         file.name.toLowerCase().endsWith('.xls') ||
         file.name.toLowerCase().endsWith('.xlsx') ||
         file.name.toLowerCase().endsWith('.ppt') ||
         file.name.toLowerCase().endsWith('.pptx');
}

// 检查是否为图片类型
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || 
         ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => 
           file.name.toLowerCase().endsWith(ext)
         );
}

// 检查是否为文本类型
export function isTextFile(file: File): boolean {
  return file.type.startsWith('text/') || 
         ['.txt', '.md', '.csv'].some(ext => 
           file.name.toLowerCase().endsWith(ext)
         );
}

// 检查是否为 PDF
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || 
         file.name.toLowerCase().endsWith('.pdf');
}

// 检查是否为 Office 文档
export function isOfficeFile(file: File): boolean {
  const officeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  
  return officeTypes.includes(file.type) || 
         ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].some(ext => 
           file.name.toLowerCase().endsWith(ext)
         );
}

// 将文件转换为 Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

// 读取文本文件内容
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file);
  });
}

// 解析 PDF 文件（使用 pdfjs-dist）
export async function parsePdfFile(file: File): Promise<string> {
  try {
    // 动态导入 PDF.js
    const { getDocument } = await import('pdfjs-dist');
    // @ts-ignore - PDF.js worker import
    (window as any).pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
    
    const typedArray = await readFileAsArrayBuffer(file);
    const pdf = await getDocument({ data: typedArray }).promise;
    
    let textContent = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const text = await page.getTextContent();
      textContent += text.items.map((item: any) => item.str).join(' ') + '\n';
    }
    
    return textContent.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF parsing failed: ' + (error as Error).message);
  }
}

// 读取文件为 ArrayBuffer
async function readFileAsArrayBuffer(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('FileReader result is not an ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

// 解析 Word 文档（使用 mammoth）
export async function parseWordFile(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const result = await mammoth.default.extractRawText({ arrayBuffer: arrayBuffer.buffer as ArrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Word parsing error:', error);
    throw new Error('Word document parsing failed: ' + (error as Error).message);
  }
}

// 解析 Excel 文档（使用 xlsx）
export async function parseExcelFile(file: File): Promise<string> {
  try {
    const xlsx = await import('xlsx');
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = xlsx.default.read(arrayBuffer, { type: 'array' });
    
    let textContent = '';
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = xlsx.default.utils.sheet_to_csv(worksheet);
      textContent += `Sheet: ${sheetName}\n${sheetText}\n\n`;
    }
    
    return textContent.trim();
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Excel document parsing failed: ' + (error as Error).message);
  }
}

// 解析 PowerPoint 文档
export async function parsePowerPointFile(file: File): Promise<string> {
  // PowerPoint 解析较为复杂，这里返回文件名作为占位符
  // 实际应用中可以考虑使用专门的库如 pptx2html
  return `PowerPoint file: ${file.name} (${Math.round(file.size / 1024)} KB) - Content extraction not implemented`;
}

// 处理单个文件
export async function processFile(file: File): Promise<{ 
  name: string; 
  type: string; 
  size: number; 
  content: string; 
  mimeType: string; 
}> {
  if (isImageFile(file)) {
    // 图片文件：转换为 Base64
    const base64 = await fileToBase64(file);
    return {
      name: file.name,
      type: 'image',
      size: file.size,
      content: base64,
      mimeType: file.type
    };
  } else if (isTextFile(file)) {
    // 文本文件：直接读取内容
    const content = await readTextFile(file);
    return {
      name: file.name,
      type: 'text',
      size: file.size,
      content,
      mimeType: file.type
    };
  } else if (isPdfFile(file)) {
    // PDF 文件：解析内容
    const content = await parsePdfFile(file);
    return {
      name: file.name,
      type: 'pdf',
      size: file.size,
      content,
      mimeType: file.type
    };
  } else if (isOfficeFile(file)) {
    // Office 文件：根据具体类型解析
    let content = '';
    if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
      content = await parseWordFile(file);
    } else if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
      content = await parseExcelFile(file);
    } else if (file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx')) {
      content = await parsePowerPointFile(file);
    }
    
    const type = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx') ? 'word' :
                 file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx') ? 'excel' :
                 file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx') ? 'powerpoint' : 'office';
    
    return {
      name: file.name,
      type,
      size: file.size,
      content,
      mimeType: file.type
    };
  } else {
    // 其他文件：读取为 Base64
    const base64 = await fileToBase64(file);
    return {
      name: file.name,
      type: 'file',
      size: file.size,
      content: base64,
      mimeType: file.type
    };
  }
}



// 批量处理文件
export async function processFiles(files: FileList): Promise<Array<{
  name: string;
  type: string;
  size: number;
  content: string;
  mimeType: string;
}>> {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isSupportedFileType(file)) {
      try {
        const processedFile = await processFile(file);
        results.push(processedFile);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // 如果处理失败，仍然添加基本信息
        results.push({
          name: file.name,
          type: 'error',
          size: file.size,
          content: `Error processing file: ${(error as Error).message}`,
          mimeType: file.type
        });
      }
    }
  }
  return results;
}