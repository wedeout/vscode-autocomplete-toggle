const fs = require('fs');
const path = require('path');

/**
 * VS Code 扩展入口
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  const vscode = require('vscode');

  const SETTINGS_KEYS = {
    quickSuggestions: 'editor.quickSuggestions',
    suggestOnTriggerCharacters: 'editor.suggestOnTriggerCharacters',
    inlineSuggest: 'editor.inlineSuggest.enabled',
    parameterHints: 'editor.parameterHints.enabled',
    acceptOnEnter: 'editor.acceptSuggestionOnEnter'
  };

  const desiredOff = {
    [SETTINGS_KEYS.quickSuggestions]: false,
    [SETTINGS_KEYS.suggestOnTriggerCharacters]: false,
    [SETTINGS_KEYS.inlineSuggest]: false,
    [SETTINGS_KEYS.parameterHints]: false,
    [SETTINGS_KEYS.acceptOnEnter]: 'off'
  };

  const desiredOn = {
    [SETTINGS_KEYS.quickSuggestions]: true,
    [SETTINGS_KEYS.suggestOnTriggerCharacters]: true,
    [SETTINGS_KEYS.inlineSuggest]: true,
    [SETTINGS_KEYS.parameterHints]: true,
    [SETTINGS_KEYS.acceptOnEnter]: 'on'
  };

  async function updateWorkspaceSettings(patch) {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) {
      vscode.window.showErrorMessage('未找到工作区，无法更新工作区设置');
      return;
    }
    const wsRoot = wsFolders[0].uri.fsPath;
    const vscodeDir = path.join(wsRoot, '.vscode');
    const settingsPath = path.join(vscodeDir, 'settings.json');
    try {
      if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });
      let current = {};
      if (fs.existsSync(settingsPath)) {
        try {
          current = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
        } catch (e) {
          current = {};
        }
      }
      const next = { ...current, ...patch };
      fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf8');
      const config = vscode.workspace.getConfiguration();
      await Promise.all(
        Object.entries(patch).map(([k, v]) => config.update(k, v, vscode.ConfigurationTarget.Workspace))
      );
      return next;
    } catch (e) {
      vscode.window.showErrorMessage('更新设置失败：' + e.message);
    }
  }

  function isDisabled() {
    const conf = vscode.workspace.getConfiguration();
    return (
      conf.get(SETTINGS_KEYS.quickSuggestions) === false &&
      conf.get(SETTINGS_KEYS.suggestOnTriggerCharacters) === false &&
      conf.get(SETTINGS_KEYS.inlineSuggest) === false &&
      conf.get(SETTINGS_KEYS.parameterHints) === false &&
      conf.get(SETTINGS_KEYS.acceptOnEnter) === 'off'
    );
  }

  const cmdToggle = vscode.commands.registerCommand('autocompleteToggle.toggle', async () => {
    const next = isDisabled() ? desiredOn : desiredOff;
    const applied = await updateWorkspaceSettings(next);
    if (applied) {
      vscode.window.showInformationMessage(`自动补全已${isDisabled() ? '开启' : '关闭'}（工作区级）`);
    }
  });

  const cmdEnable = vscode.commands.registerCommand('autocompleteToggle.enable', async () => {
    const applied = await updateWorkspaceSettings(desiredOn);
    if (applied) vscode.window.showInformationMessage('自动补全已开启（工作区级）');
  });

  const cmdDisable = vscode.commands.registerCommand('autocompleteToggle.disable', async () => {
    const applied = await updateWorkspaceSettings(desiredOff);
    if (applied) vscode.window.showInformationMessage('自动补全已关闭（工作区级）');
  });

  context.subscriptions.push(cmdToggle, cmdEnable, cmdDisable);
}

function deactivate() {}

module.exports = { activate, deactivate };