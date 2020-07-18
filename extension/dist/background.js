// --- cross browser extension
// @ts-ignore
window.browser = (function () {
    return (
    // @ts-ignore
    window.msBrowser ||
        // @ts-ignore
        window.browser ||
        // @ts-ignore
        window.chrome);
})();
// --- set default settings
var settings = {
    active: true,
};
// --- load settings from storage if available
browser.storage.local.get(["settings"], function (result) {
    // --- update from storage
    if (result && result.settings) {
        settings = result.settings;
    }
    // --- attach event handlers
    browser.browserAction.onClicked.addListener(function (tab) {
        settings.active = !settings.active;
        update();
    });
    // --- monitor active tabs
    browser.tabs.onUpdated.addListener(function (tabId, info, tab) {
        // --- check if tab has finished loading
        if (info.status === "complete" && settings.active === true) {
            browser.tabs.sendMessage(tabId, {
                action: "inject-editor",
            });
        }
    }.bind(this));
    // --- run update at least once
    update();
});
// --- main method
function update() {
    // --- update icon
    updateActiveIcon(settings.active);
    // --- save current settings
    browser.storage.local.set({ settings: settings });
}
function updateActiveIcon(state) {
    if (state) {
        browser.browserAction.setIcon({ path: "icons/on-32.png" });
    }
    else {
        browser.browserAction.setIcon({ path: "icons/off-32.png" });
    }
}
