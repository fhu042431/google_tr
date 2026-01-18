// 使表格弹窗可拖拽
function makeTablePopupDraggable(popup) {
    const header = popup.querySelector('.chrome-translator-popup-header');
    if (!header) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
        // 如果点击的是关闭按钮，不触发拖拽
        if (e.target.closest('.chrome-translator-popup-close')) {
            return;
        }

        isDragging = true;

        // 获取当前位置
        const rect = popup.getBoundingClientRect();
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;

        // 改变鼠标样式
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // 确保弹窗不会移出视口
        const maxX = window.innerWidth - popup.offsetWidth;
        const maxY = window.innerHeight - popup.offsetHeight;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        popup.style.left = currentX + 'px';
        popup.style.top = currentY + 'px';
        popup.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
}
