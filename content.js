// 内容脚本 - 处理页面交互和UI显示

let translatePopup = null;
let selectedText = '';
let popupAutoHideTimer = null;
let floatingToolbar = null;

// 自动消失时间(毫秒) - 120秒
const AUTO_HIDE_DELAY = 120000;

// 初始化
function init() {
    // 监听文本选择
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // 点击其他地方时隐藏工具栏(但不隐藏翻译弹窗)
    document.addEventListener('mousedown', (e) => {
        // 翻译弹窗不再通过点击外部关闭,只能通过关闭按钮或自动隐藏
        if (floatingToolbar && !floatingToolbar.contains(e.target)) {
            hideFloatingToolbar();
        }
    });

    // 创建悬浮工具栏(用于整段和全文翻译)
    createFloatingToolbar();
}

// 处理文本选择
function handleTextSelection(e) {
    const selection = window.getSelection();

    // 检查是否有实际的选择(不是折叠的选择)
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        // 不再自动隐藏弹窗,让用户手动关闭或等待自动隐藏
        return;
    }

    // 检查选择是否在翻译弹窗或工具栏内
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 3 ? container.parentNode : container;

        // 如果选择在翻译弹窗或工具栏内,不触发翻译
        if (element.closest('.chrome-translator-popup') ||
            element.closest('.chrome-translator-toolbar') ||
            element.closest('.chrome-translator-modal')) {
            return;
        }
    }

    const text = selection.toString().trim();

    // 只有当选中的文本长度大于0且包含非空白字符时才翻译
    if (text.length > 0 && /\S/.test(text)) {
        selectedText = text;
        // 直接翻译,不显示按钮
        performTranslation();
    }
    // 如果选择的是无效文本(空白等),不做任何操作,保持弹窗显示
}

// 执行翻译
async function performTranslation() {
    if (!selectedText) return;

    // 清除之前的定时器
    clearAutoHideTimer();

    // 获取并显示当前翻译引擎信息
    const config = translator.getConfig();
    console.log(`[翻译助手] 使用引擎: ${config.engine === 'google' ? 'Google翻译' : `AI翻译 (${config.gptModel})`}`);
    console.log(`[翻译助手] 原文:`, selectedText);

    // 显示加载状态
    showTranslatePopup('正在翻译...', true);

    try {
        const result = await translator.translate(selectedText);
        console.log(`[翻译助手] 译文:`, result);
        showTranslatePopup(result, false);

        // 设置自动消失定时器
        startAutoHideTimer();
    } catch (error) {
        console.error(`[翻译助手] 翻译失败:`, error);
        showTranslatePopup(`翻译失败: ${error.message}`, false, true);
        startAutoHideTimer();
    }
}

// 清除自动隐藏定时器
function clearAutoHideTimer() {
    if (popupAutoHideTimer) {
        clearTimeout(popupAutoHideTimer);
        popupAutoHideTimer = null;
    }
}

// 启动自动隐藏定时器
function startAutoHideTimer() {
    clearAutoHideTimer();
    popupAutoHideTimer = setTimeout(() => {
        hideTranslatePopup();
        // 清除选择,允许再次选择
        window.getSelection().removeAllRanges();
    }, AUTO_HIDE_DELAY);
}

// 显示翻译弹窗
function showTranslatePopup(text, isLoading = false, isError = false) {
    // 移除旧弹窗
    hideTranslatePopup();

    // 创建弹窗
    translatePopup = document.createElement('div');
    translatePopup.className = 'chrome-translator-popup';
    if (isLoading) {
        translatePopup.classList.add('loading');
    }
    if (isError) {
        translatePopup.classList.add('error');
    }

    // 获取当前翻译引擎信息
    const config = translator.getConfig();
    const engineName = config.engine === 'google' ? 'Google翻译' : `AI翻译 (${config.gptModel})`;

    translatePopup.innerHTML = `
    <div class="chrome-translator-popup-header">
      <div class="chrome-translator-popup-title">
        ${isLoading ? '翻译中...' : isError ? '错误' : '翻译结果'}
        <span class="chrome-translator-engine-badge">${engineName}</span>
      </div>
      <button class="chrome-translator-popup-close">×</button>
    </div>
    <div class="chrome-translator-popup-content">
      ${isLoading ? `
        <div class="chrome-translator-loader"></div>
        <div class="chrome-translator-loading-text">${text}</div>
      ` : `
        <div class="chrome-translator-original">
          <div class="chrome-translator-label">原文</div>
          <div class="chrome-translator-text">${escapeHtml(selectedText)}</div>
        </div>
        <div class="chrome-translator-divider"></div>
        <div class="chrome-translator-result">
          <div class="chrome-translator-label">译文</div>
          <div class="chrome-translator-text">${escapeHtml(text)}</div>
        </div>
      `}
    </div>
  `;

    // 鼠标悬停时暂停自动隐藏
    translatePopup.addEventListener('mouseenter', () => {
        clearAutoHideTimer();
    });

    translatePopup.addEventListener('mouseleave', () => {
        if (!translatePopup.classList.contains('loading')) {
            startAutoHideTimer();
        }
    });

    // 定位弹窗 - 在选中文本附近
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        translatePopup.style.left = `${Math.max(10, rect.left + window.scrollX)}px`;
        translatePopup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    } else {
        translatePopup.style.left = '50%';
        translatePopup.style.top = '100px';
        translatePopup.style.transform = 'translateX(-50%)';
    }

    // 添加关闭事件
    const closeBtn = translatePopup.querySelector('.chrome-translator-popup-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTranslatePopup();
    });

    document.body.appendChild(translatePopup);

    // 添加动画
    setTimeout(() => {
        if (translatePopup) {
            translatePopup.classList.add('show');
        }
    }, 10);
}

// 隐藏翻译弹窗
function hideTranslatePopup() {
    clearAutoHideTimer();
    if (translatePopup) {
        translatePopup.classList.remove('show');
        const popup = translatePopup;
        translatePopup = null;
        setTimeout(() => {
            if (popup && popup.parentNode) {
                popup.remove();
            }
        }, 200);
    }
}

// 创建悬浮工具栏
function createFloatingToolbar() {
    floatingToolbar = document.createElement('div');
    floatingToolbar.className = 'chrome-translator-toolbar';
    floatingToolbar.innerHTML = `
    <div class="chrome-translator-toolbar-title">翻译助手</div>
    <button class="chrome-translator-toolbar-btn" data-action="paragraph">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 5H21V7H3V5ZM3 11H21V13H3V11ZM3 17H15V19H3V17Z" fill="currentColor"/>
      </svg>
      段落翻译
    </button>
    <button class="chrome-translator-toolbar-btn" data-action="fullpage">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z" fill="currentColor"/>
      </svg>
      全文翻译
    </button>
    <button class="chrome-translator-toolbar-toggle">◀</button>
  `;

    // 事件处理
    floatingToolbar.querySelector('[data-action="paragraph"]').addEventListener('click', translateParagraph);
    floatingToolbar.querySelector('[data-action="fullpage"]').addEventListener('click', translateFullPage);
    floatingToolbar.querySelector('.chrome-translator-toolbar-toggle').addEventListener('click', toggleToolbar);

    document.body.appendChild(floatingToolbar);
}

// 隐藏悬浮工具栏
function hideFloatingToolbar() {
    if (floatingToolbar) {
        floatingToolbar.classList.add('collapsed');
    }
}

// 切换工具栏展开/收起
function toggleToolbar() {
    if (floatingToolbar) {
        floatingToolbar.classList.toggle('collapsed');
        const toggleBtn = floatingToolbar.querySelector('.chrome-translator-toolbar-toggle');
        toggleBtn.textContent = floatingToolbar.classList.contains('collapsed') ? '▶' : '◀';
    }
}

// 段落翻译 - 翻译鼠标悬停的段落
async function translateParagraph() {
    // 获取页面上的所有段落
    const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div');

    // 提示用户点击要翻译的段落
    showNotification('请点击要翻译的段落');

    // 添加临时点击事件
    const clickHandler = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const element = e.target;
        const text = element.textContent.trim();

        if (text.length > 0) {
            selectedText = text;

            // 高亮元素
            element.style.outline = '2px solid #667eea';

            // 显示加载状态
            showTranslatePopup('正在翻译...', true);

            try {
                const result = await translator.translate(text);
                showTranslatePopup(result, false);
                startAutoHideTimer();
            } catch (error) {
                showTranslatePopup(`翻译失败: ${error.message}`, false, true);
                startAutoHideTimer();
            }

            // 移除高亮
            setTimeout(() => {
                element.style.outline = '';
            }, 2000);
        }

        // 移除事件监听
        document.removeEventListener('click', clickHandler, true);
        hideNotification();
    };

    document.addEventListener('click', clickHandler, true);
}

// 全文翻译
async function translateFullPage() {
    // 获取页面主要文本内容
    const mainContent = document.body.innerText;

    // 限制文本长度(Google Translate API有限制)
    const maxLength = 5000;
    const textToTranslate = mainContent.length > maxLength
        ? mainContent.substring(0, maxLength) + '...'
        : mainContent;

    selectedText = textToTranslate;

    // 创建全文翻译弹窗
    showFullPageTranslation(textToTranslate);
}

// 显示全文翻译弹窗
async function showFullPageTranslation(text) {
    // 创建遮罩层和弹窗
    const overlay = document.createElement('div');
    overlay.className = 'chrome-translator-overlay';

    const modal = document.createElement('div');
    modal.className = 'chrome-translator-modal';
    modal.innerHTML = `
    <div class="chrome-translator-modal-header">
      <div class="chrome-translator-modal-title">网页全文翻译</div>
      <button class="chrome-translator-modal-close">×</button>
    </div>
    <div class="chrome-translator-modal-content">
      <div class="chrome-translator-loader"></div>
      <div class="chrome-translator-loading-text">正在翻译全文，请稍候...</div>
    </div>
  `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 关闭事件
    const closeModal = () => {
        overlay.classList.add('hiding');
        setTimeout(() => overlay.remove(), 200);
    };

    modal.querySelector('.chrome-translator-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // 显示动画
    setTimeout(() => overlay.classList.add('show'), 10);

    try {
        // 分段翻译(API有长度限制)
        const chunks = splitTextIntoChunks(text, 1000);
        const translations = [];

        for (let i = 0; i < chunks.length; i++) {
            const result = await translator.translate(chunks[i]);
            translations.push(result);

            // 更新进度
            const progress = Math.round(((i + 1) / chunks.length) * 100);
            modal.querySelector('.chrome-translator-loading-text').textContent =
                `正在翻译... ${progress}%`;
        }

        const fullTranslation = translations.join('');

        // 显示翻译结果
        modal.querySelector('.chrome-translator-modal-content').innerHTML = `
      <div class="chrome-translator-fullpage-result">
        <div class="chrome-translator-label">翻译结果</div>
        <div class="chrome-translator-fullpage-text">${escapeHtml(fullTranslation)}</div>
      </div>
    `;
    } catch (error) {
        modal.querySelector('.chrome-translator-modal-content').innerHTML = `
      <div class="chrome-translator-error">翻译失败: ${error.message}</div>
    `;
    }
}

// 将文本分割成块
function splitTextIntoChunks(text, chunkSize) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // 尝试在句子结尾处分割
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const splitPoint = Math.max(lastPeriod, lastNewline);

            if (splitPoint > start) {
                end = splitPoint + 1;
            }
        }

        chunks.push(text.substring(start, end));
        start = end;
    }

    return chunks;
}

// 显示通知
function showNotification(message) {
    hideNotification();

    const notification = document.createElement('div');
    notification.className = 'chrome-translator-notification';
    notification.id = 'chrome-translator-notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
}

// 隐藏通知
function hideNotification() {
    const existing = document.getElementById('chrome-translator-notification');
    if (existing) {
        existing.remove();
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
        selectedText = request.text;
        performTranslation();
    } else if (request.action === 'translateFullPage') {
        translateFullPage();
    } else if (request.action === 'translateParagraph') {
        translateParagraph();
    } else if (request.action === 'reloadConfig') {
        // 重新加载翻译器配置
        translator.loadConfig();
    }
});

// 启动
init();
