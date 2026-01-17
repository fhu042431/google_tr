// 翻译服务模块
class Translator {
  constructor() {
    this.cache = new Map();
    this.config = {
      engine: 'google', // 'google' 或 'gpt'
      gptApiKey: 'sk-c2bf4ae57ed945469c1d57088d32b864',
      gptModel: 'claude-sonnet-4-5',
      gptApiUrl: 'http://127.0.0.1:8045/v1/chat/completions'
    };
    this.loadConfig();
  }

  /**
   * 从storage加载配置
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get(['translatorConfig']);
      if (result.translatorConfig) {
        this.config = { ...this.config, ...result.translatorConfig };
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  /**
   * 保存配置到storage
   */
  async saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      await chrome.storage.sync.set({ translatorConfig: this.config });
    } catch (error) {
      console.error('保存配置失败:', error);
    }
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
    const cacheKey = `${this.config.engine}:${cleanText}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      let result;

      // 根据配置选择翻译引擎
      if (this.config.engine === 'gpt') {
        result = await this.translateWithGPT(cleanText);
      } else {
        result = await this.translateWithGoogle(cleanText);
      }

      // 缓存结果
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('翻译失败:', error);
      throw new Error(`翻译服务暂时不可用: ${error.message}`);
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
   * 使用GPT API翻译
   * @param {string} text - 要翻译的文本
   * @returns {Promise<string>} 翻译结果
   */
  async translateWithGPT(text) {
    if (!this.config.gptApiKey) {
      throw new Error('请先配置GPT API密钥');
    }

    const response = await fetch(this.config.gptApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.gptApiKey}`
      },
      body: JSON.stringify({
        model: this.config.gptModel,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的英译中翻译助手。请将用户提供的英文文本翻译成日语。只返回翻译结果,不要添加任何解释或额外内容。'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }

    throw new Error('无法解析GPT翻译结果');
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// 创建全局翻译器实例
const translator = new Translator();
