// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const parser = require("./parser")

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {

	console.log('Congratulations, your extension "Clay" is now active!');

	let disposable = vscode.commands.registerCommand('extension.schema2bean', function () {
		vscode.env.clipboard.readText().then( (clipString) => {
			handleSchema2bean(clipString);
		});
	});
	context.subscriptions.push(disposable);

	let disposable2 = vscode.commands.registerCommand('extension.spi2request', function () {
		handleSpi2Request();
	});
	context.subscriptions.push(disposable2);

	let disposable3 = vscode.commands.registerCommand('extension.text2some', function () {
		handleText2Some();
	});
	context.subscriptions.push(disposable3);


}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

function handleSchema2bean (clipString) {

	if (!clipString || !clipString.length) {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let document = editor.document;
			let selection = editor.selection;
			clipString = document.getText(selection);
		}

		if (!clipString || !clipString.length) {
			vscode.window.showErrorMessage('No text in clipboard or selection');
			return;
		}
	}

	vscode.window.showQuickPick(parser.parserNames).then(type => {
		try {
			let editor = vscode.window.activeTextEditor;;
			let result = parser.parse(type, clipString);
			if (editor) {
				editor.edit(function (editBuilder) {
					let selection = editor.selection;
					editBuilder.replace(selection, result);
				});
			}
		} catch (error) {
			vscode.window.showErrorMessage(error.toString());
		}
	})

}

function handleSpi2Request() {

	let editor = vscode.window.activeTextEditor;
	var start = editor.selection.start.line;
	var end = start;

	while(end != editor.document.lineCount) {
		var linetext = editor.document.lineAt(end).text
		if(linetext.indexOf(";") > 0) {
			break;
		}
		end++;
	}

	var firstLine = editor.document.lineAt(start);
	var lastLine = editor.document.lineAt(end);
	var textRange = new vscode.Range(start, firstLine.range.start.character, 
									end,lastLine.range.end.character);


	let spitext = editor.document.getText(textRange)
	let content = parser.parseSpi(spitext)
	vscode.workspace.openTextDocument({content:content}).then( document => {
		vscode.window.showTextDocument(document);
	});
}

function handleText2Some() {

	vscode.window.showQuickPick(parser.textParserNames).then(type => {
		try {

			let editor = vscode.window.activeTextEditor;
			let document = editor.document;
			let selection = editor.selection;
			let text = document.getText(selection);
			if (!text || text.length == 0) {
				vscode.window.showErrorMessage("No text selected");
				return;
			}

			let result = parser.textParse(type, text);
			console.log(result);
			if (editor) {
				editor.edit(function (editBuilder) {
					let selection = editor.selection;
					editBuilder.replace(selection, result);
				});
			}
		} catch (error) {
			vscode.window.showErrorMessage(error.toString());
		}
	})

}


module.exports = {
	activate,
	deactivate
}
