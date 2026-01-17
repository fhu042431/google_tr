// 翻译服务模块
class Translator {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 翻译英文到中文
   * @param {string} text - 要翻译的英文文本
   * @returns {Promise<string>} 翻译结果
   */
  async translate(text) {
    // 清理文本
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('文本不能为空');
    }

    // 检查缓存
    if (this.cache.has(cleanText)) {
      return this.cache.get(cleanText);
    }

    try {
      // 使用Google Translate API
      const result = await this.translateWithGoogle(cleanText);
      
      // 缓存结果
      this.cache.set(cleanText, result);
      
      return result;
    } catch (error) {
      console.error('翻译失败:', error);
      throw new Error('翻译服务暂时不可用,请稍后重试');
    }
  }

  /**
   * 使用Google Translate API翻译
   * @param {string} text - 要翻译的文本
   * @returns {Promise<string>} 翻译结果
   */
  async translateWithGoogle(text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 解析Google Translate API的响应
    // 响应格式: [[[翻译文本, 原文本, null, null, 10]], null, "en", ...]
    if (data && data[0] && data[0].length > 0) {
      return data[0].map(item => item[0]).join('');
    }
    
    throw new Error('无法解析翻译结果');
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 创建全局翻译器实例
const translator = new Translator();
