export const focusOnElement = (elementId) => {
    document.getElementById(elementId).focus();
    setTimeout(() => {
        const input = document.getElementById(elementId);
        if (input) {
            input.focus();
        }
    }, 100);
}