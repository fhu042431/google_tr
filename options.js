// 设置页面脚本
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('settingsForm');
    const engineRadios = document.querySelectorAll('input[name="engine"]');
    const gptSettings = document.getElementById('gptSettings');
    const gptApiKeyInput = document.getElementById('gptApiKey');
    const gptModelSelect = document.getElementById('gptModel');
    const gptApiUrlInput = document.getElementById('gptApiUrl');
    const resetBtn = document.getElementById('resetBtn');
    const statusMessage = document.getElementById('statusMessage');

    // 加载保存的配置
    await loadSettings();

    // 监听引擎选择变化
    engineRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'gpt') {
                gptSettings.classList.remove('hidden');
            } else {
                gptSettings.classList.add('hidden');
            }
        });
    });

    // 保存设置
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    // 重置设置
    resetBtn.addEventListener('click', async () => {
        if (confirm('确定要重置所有设置吗?')) {
            await resetSettings();
        }
    });

    /**
     * 加载设置
     */
    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['translatorConfig']);

            if (result.translatorConfig) {
                const config = result.translatorConfig;

                // 设置引擎
                const engineRadio = document.querySelector(`input[name="engine"][value="${config.engine}"]`);
                if (engineRadio) {
                    engineRadio.checked = true;
                    if (config.engine === 'gpt') {
                        gptSettings.classList.remove('hidden');
                    }
                }

                // 设置GPT配置
                if (config.gptApiKey) {
                    gptApiKeyInput.value = config.gptApiKey;
                }
                if (config.gptModel) {
                    gptModelSelect.value = config.gptModel;
                }
                if (config.gptApiUrl) {
                    gptApiUrlInput.value = config.gptApiUrl;
                }
            }
        } catch (error) {
            showMessage('加载设置失败: ' + error.message, 'error');
        }
    }

    /**
     * 保存设置
     */
    async function saveSettings() {
        try {
            const engine = document.querySelector('input[name="engine"]:checked').value;

            const config = {
                engine: engine,
                gptApiKey: gptApiKeyInput.value.trim(),
                gptModel: gptModelSelect.value,
                gptApiUrl: gptApiUrlInput.value.trim() || 'http://127.0.0.1:8045/v1/chat/completions'
            };

            // 验证GPT配置
            if (engine === 'gpt' && !config.gptApiKey) {
                showMessage('使用GPT翻译需要配置API密钥', 'error');
                return;
            }

            // 保存到storage
            await chrome.storage.sync.set({ translatorConfig: config });

            // 通知所有标签页重新加载配置
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { action: 'reloadConfig' }).catch(() => {
                    // 忽略错误,某些标签页可能没有content script
                });
            }

            showMessage('设置保存成功!', 'success');
        } catch (error) {
            showMessage('保存设置失败: ' + error.message, 'error');
        }
    }

    /**
     * 重置设置
     */
    async function resetSettings() {
        try {
            await chrome.storage.sync.remove(['translatorConfig']);

            // 重置表单
            document.getElementById('engineGoogle').checked = true;
            gptSettings.classList.add('hidden');
            gptApiKeyInput.value = '';
            gptModelSelect.value = 'gpt-3.5-turbo';
            gptApiUrlInput.value = '';

            showMessage('设置已重置', 'success');
        } catch (error) {
            showMessage('重置失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示状态消息
     */
    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;

        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 3000);
    }
});
