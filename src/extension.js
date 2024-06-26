
const vscode = require('vscode');
const path = require('path');
import sections from '../db/dataBaseSection.json';
import allKeys from '../db/dataBaseKey.json';
import values from '../db/dataBaseValue.json';



function activate(context) {
	console.log('Congratulations, extension "RWini-Plugin" is now active!');



	//Parsing functions
	class indexToPosition{constructor(index,text){
		let lineNumber = 0
		let lastNewLine = 0
		for (let i=0; i<index;i++){
			if (text[i]=='\n'){
				lineNumber+=1
				lastNewLine = i
			}
		}
		this.line = lineNumber
		this.char = index-lastNewLine
	}}

	function positionToIndex(position,text){
		let i = 0
		let lineNumber = 0
		while (lineNumber<position.line){
			if (text[i]=='\n'){
				lineNumber++
			}
			i++
		}
		return (i+position.character)
	}

	function getIfMultiline(document,position){
		let matchedMultlineNotations = document.getText().substring(0,positionToIndex(position,document.getText())).matchAll(/\"\"\"/g)
		let number = [...matchedMultlineNotations].length
		if (number%2==1){return true}
		else{return false}
	};
	
	function sectionNameCorrection(inputSectionName){
		let outputSectionName=''
	    switch (inputSectionName) {
			case 'arm': outputSectionName='leg';
			break;
			case 'hiddenAction': outputSectionName='action';
			break;
			case 'global_resource': outputSectionName='resource';
			break;
			case 'comment': outputSectionName='';
			break;
			case 'template': outputSectionName='';
			break;
			default: outputSectionName=inputSectionName;
			break;
	    }
		return outputSectionName
	};

	function getSection(document,position){
		//Get current section
		var offset = 0
		while (offset<document.lineCount && finding==null){
			var finding = document.lineAt(position.line-offset).text.match(/(?<![^ ]+ *)\[/);
			if (finding!=null){
				var begin = document.lineAt(position.line-offset).text.indexOf('[')
				if (document.lineAt(position.line-offset).text.indexOf('_')>0)
				    {var end = document.lineAt(position.line-offset).text.indexOf('_')}
					else
					{var end = document.lineAt(position.line-offset).text.indexOf(']')};
				let currentSection0 = document.lineAt(position.line-offset).text.substring(begin+1,end);
				let currentSection = sectionNameCorrection(currentSection0)
				return currentSection;
			}
			offset++;
		};
	};

	function getCustomSections(sectionName,document){
		//Get custom section names
		let allCustomSections = document.getText().match(/(?<=\n *\[)\w+/mg);
		let customSections = []
		allCustomSections.map(inputSection=>{
			if (sectionNameCorrection(inputSection.split('_')[0])==sectionName){
				let outputSection = inputSection.split('_')[1];
		        customSections.push(outputSection)
		    }
		});
		return customSections;
	};

	function getKeyInMultipleLine(document,position){
		if (getIfMultiline(document,position)==true){
			var offset = 0
			while (offset<100 && finding==null){
				var finding = document.lineAt(position.line-offset).text.match(/\"\"\"/);
				if (finding!=null){var currentKey = document.lineAt(position.line-offset).text.match(/(?<![^ ]+ *)\w+/)}
				offset++
			};
			return currentKey
		}
	};

	function replaceLocalvariables(value,position,document){
		let matchedVariables = value.matchAll(/\$\{\w+\}/g)
		for (let variable of matchedVariables){
			let offset = 0
			let localVariableName = variable[0].substring(2,variable[0].length-1)
			var finding = null
			while (offset<100 && finding==null && sectionBoundary==null){
				let pattern = new RegExp(`(?<=@define +${localVariableName}: *).+`)
				var finding = document.lineAt(position.line-offset).text.match(pattern);
				var sectionBoundary = document.lineAt(position.line-offset).text.match(/(?<![^ ]+ *)\[/);
				if (finding!=null){value = value.replace(variable[0],finding[0].replace(' ',''))}
				offset++;
			};
		}
		return value
	}

	class mergeMultiline{constructor(document){
		let splitedDocument = document.getText().split('"""')
		let mergedLines = []
		let startPositions = []
		let endPositions = []
		let keys = []
		for (let i=1;i<splitedDocument.length;i+=2){
			let singleMergedLine = splitedDocument[i].replace(/[\r\n]+/g,'')
			let linesBefore = splitedDocument[i-1].split('\n')
			let startPosition = 0
			let lastLine = ''
			for (let j=0;j<i;j++){startPosition+=splitedDocument[j].length+3}
			for (let line in linesBefore){lastLine=linesBefore[line]}
		    mergedLines.push(singleMergedLine)
			startPositions.push(startPosition-1)
			endPositions.push(startPosition+splitedDocument[i].length-1)
			keys.push(lastLine.match((/(?<![^ ]+ *)\w+/)))
		}
	    this.mergedLines = mergedLines
		this.startPositions = startPositions
		this.endPositions = endPositions
		this.keys = keys
	}};

	class getCustomVariable {
		constructor(document){
		    var memNumber = document.getText().match(/(?<=number\[?\]? +)\w+|(?<=@memory +)\w+(?=: *number\[?\]?)/ig);
			if (memNumber == null){this.memNumber = []} else {this.memNumber = memNumber};
			var rscNumber = document.getText().match(/(?<=\[resource_)\w+/ig);
			if (rscNumber == null){this.rscNumber = []} else {this.rscNumber = rscNumber};
		    var memFloat = document.getText().match(/(?<=float\[?\]? +)\w+|(?<=@memory +)\w+(?=: *float\[?\]?)/ig);
			if (memFloat == null){this.memFloat = []} else {this.memFloat = memFloat};
		    var memUnitRef = document.getText().match(/(?<=unit\[?\]? +)\w+|(?<=@memory +)\w+(?=: *unit\[?\]?)/ig);
			if (memUnitRef == null){this.memUnitRef = []} else {this.memUnitRef = memUnitRef};
			var memString = document.getText().match(/(?<=string +)\w+|(?<=@memory +)\w+(?=: *string)/ig);
			if (memString == null){this.memString = []} else {this.memString = memString};
			var memBool = document.getText().match(/(?<=(bool|boolean)\[?\]? +)\w+|(?<=@memory +)\w+(?=: *(bool|boolean)\[?\]?)/ig);
			if (memBool == null){this.memBool = []} else {this.memBool = memBool};
	    }
	};
    
	

	// Semantic Tokens
	const selector= {language:'rwini',scheme:'file'}
    const tokenTypes = ['memory','event'];
    const tokenModifiers = ['default'];
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

	class provider {
		provideDocumentSemanticTokens(document){ 
			const builder = new vscode.SemanticTokensBuilder();
			let customVariables = new getCustomVariable(document);
			let allVariables = [];
			for(let variableType in customVariables){
				customVariables[variableType].forEach(variable=>allVariables.push(variable))
			};
			allVariables.forEach(variable=>{
				let pattern = new RegExp(`${variable}(?=[ =,\n:]+)`,"g");
				let matchs = document.getText().matchAll(pattern);
				for (let matchedVariables of matchs){
					let position = new vscode.Position(
						new indexToPosition(matchedVariables.index,document.getText()).line,
						new indexToPosition(matchedVariables.index,document.getText()).char
					);
					if (document.lineAt(position).text.match(/setUnitMemory|defineUnitMemory|@memory|updateUnitMemory/)!=null || 
						document.getText().substring(matchedVariables.index-7,matchedVariables.index)=='memory.' ||
						getIfMultiline(document,position)
					){builder.push(position.line,position.character-1,matchedVariables[0].length,0)}
				}
			});
			for (let i=0;i<document.lineCount;i++){
				let currentLine = document.lineAt(i).text;
				let currentKey = currentLine.match(/(?<![^ ]+ *)\w+/);
				if (currentKey=='autoTriggerOnEvent'){
					builder.push(i,19,50,1)
				}
			};
			return builder.build();
		}
	};
    const semanticProvider = vscode.languages.registerDocumentSemanticTokensProvider(selector,new provider,legend);
    
	

	// Auto-Completing
	const overrideProvider = vscode.languages.registerCompletionItemProvider('rwini',{
		provideCompletionItems(){return [new vscode.CompletionItem('.')]}
	});

	const sectionProvider = vscode.languages.registerCompletionItemProvider('rwini',{
		provideCompletionItems(document,position){
			let currentLine = document.lineAt(position).text;
			if (currentLine.match(/(?<![^ ]+ *)\[/)!=null && currentLine.indexOf('_')<0 && getIfMultiline(document,position)==false){
				return Object.keys(sections).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.File)})
			}
		}
	},'[');

	const keyProvider = vscode.languages.registerCompletionItemProvider('rwini',{
		provideCompletionItems(document,position){
			let currentLine = document.lineAt(position).text;
			if (currentLine.match(/[:,#,_,[]/)==null && getIfMultiline(document,position)==false){
				let currentSection = getSection(document,position);
				let keysOfSection = Object.keys(allKeys[currentSection]).concat(Object.keys(allKeys['template']));
			    return keysOfSection.map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Keyword)})
			}
		}
	},'@');

	function getAllCustomVariableCompletion(document){
		let memorys = [];
		let customVariables = new getCustomVariable(document);
		for(let variableType in customVariables){
			if (variableType.startsWith('mem')){
				customVariables[variableType].forEach(variable=>memorys.push('memory.'+variable))
			} else{
				customVariables[variableType].forEach(variable=>memorys.push('resource.'+variable))
			}
		};
		return memorys.map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Variable)});
	};
    
	const commonValuesProvider = vscode.languages.registerCompletionItemProvider('rwini',{
        provideCompletionItems(document,position){
			let currentLine = document.lineAt(position).text;
            if (currentLine.match(/:/)!=null){
				let currentSection = getSection(document,position);
				let currentKey = currentLine.match(/(?<![^ ]+ *)\w+/);
				let currentValue = currentLine.substring(currentKey[0].length+1);
				let type = allKeys[currentSection][currentKey[0]][0];
				if (type.match(/(?<!unit)Ref/)==null){
					let completions = [];
					switch (type) {
						case 'bool': if (currentValue.match(/[^ ]/)==null){
							completions = ['true','false'].map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Constant)});
						};
						break;
						case 'logicBoolean': if (currentValue.match(/[^ ]/)==null){
						    completions = ['true','false','if'].map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Constant)});
						};
						break;
						case 'memory': {
							let memorys = [];
						    let customVariables = new getCustomVariable(document);
						    for(let variableType in customVariables){customVariables[variableType].forEach(variable=>memorys.push(variable))};
							completions = memorys.map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Variable)});
						};
						break;
						case 'event': {
						    let events = Object.keys(values['events']);
							completions = events.map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Event)});
						};
						break;
					};
					return completions;
				} else {
					//Section-ref completion
					let sectionName = type.slice(0,-3);
					return getCustomSections(sectionName,document).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.File)});
				}
			}
		}
	},':',' ',',');

    const logicValueProvider = vscode.languages.registerCompletionItemProvider('rwini',{
	    provideCompletionItems(document,position){
			let currentSection = getSection(document,position);
			let currentLine = document.lineAt(position).text;
			let currentKey;
			if (currentLine.match(/:/)!=null && getIfMultiline(document,position)!=true){
				currentKey = currentLine.match(/(?<![^ ]+ *)\w+/);
			}else if (getIfMultiline(document,position)==true){
				currentKey = getKeyInMultipleLine(document,position);
			};
			if (['logicBoolean','dynamicFloat','unitRef','memory'].includes(allKeys[currentSection][currentKey[0]][0])){
				if ([' ','=','('].includes(currentLine.charAt(position.character-1))){
					return Object.keys(values['unitRef']).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Reference)}).concat(
						Object.keys(values['function']).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Function)})).concat(
						getAllCustomVariableCompletion(document))
				}else if (['.'].includes(currentLine.charAt(position.character-1))){
					return Object.keys(values['unitProperty']).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Property)}).concat(
						Object.keys(values['unitRef']).map(names=>{return new vscode.CompletionItem(names,vscode.CompletionItemKind.Reference)})).concat(
						getAllCustomVariableCompletion(document))
				}
			}
	    }
    },':',' ','.','=');

	const parameterProvider = vscode.languages.registerCompletionItemProvider('rwini',{
	    provideCompletionItems(document,position){
			let currentSection = getSection(document,position);
			let currentLine = document.lineAt(position).text;
			let currentKey = currentLine.match(/(?<![^ ]+ *)\w+/);
			let currentValue = '';
			let offset=0;
			while ( offset<position.character && currentValue==''){
				if (currentLine.charAt(position.character-offset)=='('){
					let valuePosition = new vscode.Position(position.line,position.character-offset-1);
					currentValue = document.getText(document.getWordRangeAtPosition(valuePosition));
				} else if (currentLine.charAt(position.character-offset)==')'){
					currentValue = '';
				};
				offset++
			};
			let valueInfo = [];
		    for(let type in values){
				if (values[type][currentValue]!=undefined){valueInfo = values[type][currentValue]}
			};
			if (currentValue!='' && allKeys[currentSection][currentKey]!=undefined){
				if (valueInfo[3]!=undefined){
					return (valueInfo[3].concat(Object.keys(values['otherParameters']))).map(paras=>{return new vscode.CompletionItem(paras,vscode.CompletionItemKind.TypeParameter)})
				} else if (allKeys[currentSection][currentKey][0]=='unitName'){
					let parameters = Object.keys(values['spawnUnit'])//.concat(Object.keys(values['otherParameters']))
					return parameters.map(paras=>{return new vscode.CompletionItem(paras,vscode.CompletionItemKind.TypeParameter)})
				} else if (allKeys[currentSection][currentKey][0]=='projectileRef'){
					let parameters = Object.keys(values['spawnProjectile'])//.concat(Object.keys(values['otherParameters']))
					return parameters.map(paras=>{return new vscode.CompletionItem(paras,vscode.CompletionItemKind.TypeParameter)})
				}
			}
	    }
    },'(',' ',',','=');



	// Hover Prompts
	const keyHoverPrompt = vscode.languages.registerHoverProvider('rwini',{
	    provideHover(document,position){
			if(document.lineAt(position).text.indexOf(':')>position.character){
				let currentSection = getSection(document,position)
                let key = document.getText(document.getWordRangeAtPosition(position,/@?\w+/));
				let occurSections = '';
				for(let section in allKeys){
					if (allKeys[section][key]!=undefined){
						occurSections+=`[${section}](ValueType: ${allKeys[section][key][0]})  `;
					}
					else{
						let MLKey = key.slice(0,-3);
						if (allKeys[section][MLKey]!=undefined){
						occurSections+=`[${section}](ValueType: ${allKeys[section][MLKey][0]})  `
						}
					}
				}
				if (occurSections != ''){
					let markdownContent = new vscode.MarkdownString(
						`Translation: \'${allKeys[currentSection][key][2]}\'  
						 Section: ${occurSections}  
						 ------  
						 Decription([${currentSection}]):  
						 \'${allKeys[currentSection][key][3]}\'`
					);
					return new vscode.Hover(markdownContent);
				}
			}
	    }
	});

	const valueHoverPrompt = vscode.languages.registerHoverProvider('rwini',{
	    provideHover(document,position){
            let catchedValue = document.getText(document.getWordRangeAtPosition(position));
			if(document.lineAt(position).text.indexOf(':')<position.character || getIfMultiline(document,position)==true){
				let valueInfo = [];
		        for(let type in values){
					if (values[type][catchedValue]!=undefined){valueInfo = values[type][catchedValue]}
				};
				if (valueInfo[0] != undefined){
					let parameters = ''
					if (valueInfo[3]!=undefined){
						for (let para in valueInfo[3]){parameters+=`(${valueInfo[3][para]}) `};
					} else{parameters='none'};
					let markdownContent = new vscode.MarkdownString(
						`Translation: \'${valueInfo[1]}\'  
						 Type: ${valueInfo[0]}  
						 Parameters: ${parameters}  
						 ------  
						 Decription:  
						 \'${valueInfo[2]}\'`  
					);
					return new vscode.Hover(markdownContent);
				} else{
					let customVaribles = new getCustomVariable(document)
					for(let type in customVaribles){
						if (customVaribles[type].includes(catchedValue)){valueInfo = [catchedValue,type]}
					};
					if (valueInfo[0] != undefined){
						let markdownContent = new vscode.MarkdownString(
							`Name: \'${valueInfo[0]}\'  
							 Type: ${valueInfo[1].substring(3)}  
							 ------  
							 Decription:  
							 \'Custom variables defined by @memory or [resource_x].\'`
					    );
					    return new vscode.Hover(markdownContent);
				    }
				}
			}
	    }
	});

	function isFileName(word){
		return (
		word.endsWith('.ini') || word.endsWith('.txt') || 
		word.endsWith('.png') || word.endsWith('.template') || 
		word.endsWith('.wav') || word.endsWith('.md')
		)
	}

	const fileJumpHoverPrompt = vscode.languages.registerHoverProvider('rwini', {
        provideHover(document, position){
            let range = document.getWordRangeAtPosition(position, /(ROOT:)?[^ ]+/i);
            let filePath = document.getText(range);
			let mainFolders = vscode.workspace.workspaceFolders
            if (filePath && isFileName(filePath)) {
				let fileUri
				if (filePath.startsWith('ROOT:')){
					//Finding the correct folder path
					let rootPath = path.dirname(mainFolders[0].uri.fsPath);
					let documentPath = path.dirname(document.uri.fsPath);
					let remainPath = documentPath.substring(rootPath.length,documentPath.length)
					let offset = 1;
					let finding = false;
					while (!finding && offset<50){
						if (remainPath.charAt(offset)=='\\'){finding = true};
						offset++
					};
					let currentDir = documentPath.substring(0,rootPath.length+offset);
					fileUri = vscode.Uri.file(path.join(currentDir,filePath.substring(5,filePath.length)));
				}else{
					let currentDir = path.dirname(document.uri.fsPath);
					fileUri = vscode.Uri.file(path.join(currentDir,filePath));
				};
                let markdownString = new vscode.MarkdownString(`Open File: [${filePath}](${fileUri})`);
                markdownString.isTrusted = true;
                return new vscode.Hover(markdownString, range);
            }
        }
    });

	const fileJumpCommand = vscode.commands.registerCommand('extension.openFile', (fileUri) => {
        vscode.window.showTextDocument(fileUri);
    });



    // Folding
	const sectionFoldingProvider = vscode.languages.registerFoldingRangeProvider('rwini', {
		provideFoldingRanges(document) {
			let ranges = [];
			for (let i=0; i<document.lineCount; i++){
				let currentLine = document.lineAt(i).text;
				if (currentLine.match(/(?<![^ ]+ *)\[/)){
					const start = i;
					i++;
					while (i<document.lineCount && !document.lineAt(i).text.match(/(?<![^ ]+ *)\[/)){i++};
					if (i<document.lineCount){ranges.push(new vscode.FoldingRange(start,i-1,vscode.FoldingRangeKind.Region))}
					else{ranges.push(new vscode.FoldingRange(start,document.lineCount-1,vscode.FoldingRangeKind.Region))};
					i-=1;
				}
			}
			return ranges;
		}
	})

	const multilineFoldingProvider = vscode.languages.registerFoldingRangeProvider('rwini', {
		provideFoldingRanges(document) {
			let ranges = [];
			for (let i=0; i<document.lineCount; i++){
				let currentLine = document.lineAt(i).text;
				if (currentLine.match(/\"\"\"/)){
					const start = i;
					i++;
					while (i<document.lineCount && !document.lineAt(i).text.match(/\"\"\"/)){i++};
					if (i<document.lineCount){ranges.push(new vscode.FoldingRange(start,i,vscode.FoldingRangeKind.Region))};
					i-=1;
				}
			}
			return ranges;
		}
	})



	// Diagnostic 
	function uniquenessTest(string,RegExp){
		let remains = string.replace(RegExp,'#')
		if (remains.match(/[^ #]/)!=null || remains.split('#').length>2){return false}
		else{return true}
	};

	function diagnoseValue(expectedValue,value){
		switch (expectedValue) {
			case 'bool': {
				if (uniquenessTest(value,/(true|false)/)==false){return true}
			};
			break;
			case 'int': {
				if (uniquenessTest(value,/-?\d+/)==false){return true}
			};
			break;
			case 'float': {
				if (uniquenessTest(value,/-?\d+\.?\d*/)==false){return true}
			};
			break;
			case 'time': {
				if (uniquenessTest(value,/\d+\.?\d* *s?/)==false){return true}
			};
			break;
		}
	};

	const collection = vscode.languages.createDiagnosticCollection('rwiniKey');
	vscode.workspace.onDidChangeTextDocument(event=>{
		const diagnostics = [];
		let allSections = event.document.getText().matchAll(/(?<=\n *\[)[^_\]]+/img);
		for (let section of allSections){
			//Check section
			if (sections[section[0]]==undefined){
				let sectionPosition = new indexToPosition(section.index, event.document.getText())
				let sectionStart = new vscode.Position(sectionPosition.line,sectionPosition.char);
				let sectionEnd = new vscode.Position(sectionPosition.line,sectionPosition.char+section[0].length);
				let range = new vscode.Range(sectionStart,sectionEnd);
				if (getIfMultiline(event.document,sectionStart)==false){
				    const diagnostic = new vscode.Diagnostic(range,`Unknown section: ${section[0]}`,vscode.DiagnosticSeverity.Error);
				    diagnostics.push(diagnostic)
				}
			}
		};
		for (let line=0; line<event.document.lineCount; line++){
			//Check key
			let currentLine = event.document.lineAt(line).text;
			let currentKey = (/(?<![^ ]+ *)\w+/).exec(currentLine);
			if (currentKey!==null && currentKey[0].match(/(body|leg|arm|effect|mutator)\d?_/)==null){
				let keyStart = new vscode.Position(line,currentKey.index);
				let keyEnd = new vscode.Position(line,currentKey.index+currentKey[0].length);
				let range = new vscode.Range(keyStart,keyEnd);
				let currentSection = getSection(event.document,keyStart);
				if (allKeys[currentSection]!=undefined && currentSection!='' && getIfMultiline(event.document,keyStart)==false ){
					if (allKeys[currentSection][currentKey[0]]==undefined && allKeys[currentSection][currentKey[0].slice(0,-3)]==undefined){
						const diagnostic = new vscode.Diagnostic(range,`Can not find key \'${currentKey[0]}\' under section: ${currentSection}`,vscode.DiagnosticSeverity.Error);
						diagnostics.push(diagnostic)
					}
					//Check value
					else if(currentLine.match(/\"\"\"/)==null){
						let valueStartChar = currentKey.index+currentKey[0].length+1
						let valueStart = new vscode.Position(line,valueStartChar);
						let valueEnd = new vscode.Position(line,valueStartChar+currentLine.substring(valueStartChar).length);
						let currentValue = replaceLocalvariables(currentLine.substring(valueStartChar),valueStart,event.document)
					    let range = new vscode.Range(valueStart,valueEnd);
					    let expectedValue = allKeys[currentSection][currentKey[0]][0];
						let valueInfo = [];
						for(let type in values){
							if (values[type][currentValue]!=undefined){valueInfo = values[type][currentValue]}
						};
						const preDiagnostic = new vscode.Diagnostic(range,`Unexpected value:\'${currentValue}\'(type=\'${valueInfo[0]}\'), Key: ${currentKey}(expectedType=\'${expectedValue}\')`,vscode.DiagnosticSeverity.Error);
						if (diagnoseValue(expectedValue,currentValue)==true){diagnostics.push(preDiagnostic)}							
					}
				}
			}
		};
		let multilines = new mergeMultiline(event.document) 
		for (let line in multilines.mergedLines){
			//Check multiline 
			let currentKey = multilines.keys[line];
			let valueStartPosition = new indexToPosition(multilines.startPositions[line],event.document.getText())
			let valueStart = new vscode.Position(valueStartPosition.line,valueStartPosition.char);
			let currentSection = getSection(event.document,valueStart);
			if (allKeys[currentSection]!=undefined && currentSection!=''){
				if (allKeys[currentSection][currentKey[0]]!=undefined || allKeys[currentSection][currentKey[0].slice(0,-3)]!=undefined){
					let currentValue = replaceLocalvariables(multilines.mergedLines[line],valueStart,event.document)
					let valueEndPosition = new indexToPosition(multilines.endPositions[line],event.document.getText())
					let valueEnd = new vscode.Position(valueEndPosition.line,valueEndPosition.char);
					let range = new vscode.Range(valueStart,valueEnd);
					let expectedValue = allKeys[currentSection][currentKey[0]][0];
					let valueInfo = [];
					for(let type in values){
						if (values[type][currentValue]!=undefined){valueInfo = values[type][currentValue]}
					};
					const preDiagnostic = new vscode.Diagnostic(range,`Unexpected value:\'${currentValue}\'(type=\'${valueInfo[0]}\'), Key: ${currentKey}(expectedType=\'${expectedValue}\')`,vscode.DiagnosticSeverity.Error);
					if (diagnoseValue(expectedValue,currentValue)==true){diagnostics.push(preDiagnostic)}	
				}
			}
		}
		collection.set(event.document.uri,diagnostics);
	})



	context.subscriptions.push(
		semanticProvider,

		overrideProvider,
		sectionProvider,
		keyProvider,
		commonValuesProvider,
		logicValueProvider,
		parameterProvider,

		keyHoverPrompt,
		valueHoverPrompt,
		fileJumpHoverPrompt,
		fileJumpCommand,

		sectionFoldingProvider,
		multilineFoldingProvider
	);
}


function deactivate(){}
module.exports = {activate,deactivate}




