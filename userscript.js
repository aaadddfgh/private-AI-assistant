// ==UserScript==
// @name         AI
// @namespace    http://tampermonkey.net/
// @version      2024-12-23
// @description  Your personal AI assistant.
// @author       aaadddfgh
// @match        http://*/*
// @match        https://*/*

// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

/*
MIT License

Copyright (c) 2024 aaadddfgh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function() {
    'use strict';
    let baseURL="http://localhost:11434/v1/chat/completions"

    let mozillareadability,PartialJSON = null;

    (async ()=>{
        mozillareadability = await import('https://cdn.jsdelivr.net/npm/@mozilla/readability@0.5.0/+esm');
        PartialJSON = await import('https://cdn.jsdelivr.net/npm/partial-json@0.1.7/+esm');
    })();

    class TextDialog {
        constructor(text) {
            // 创建对话框元素
            this.dialog = document.createElement('div');
            this.dialog.style.position = 'fixed';
            this.dialog.style.top = '0';
            this.dialog.style.right = '0';  // 靠右侧
            this.dialog.style.width = '300px';  // 可以根据需求调整宽度
            this.dialog.style.height = '100vh';  // 高度为 100vh
            this.dialog.style.backgroundColor = 'white';
            this.dialog.style.borderLeft = '1px solid #ccc';
            this.dialog.style.paddingTop = '40px';  // 为关闭按钮腾出空间
            this.dialog.style.paddingLeft = '20px';
            this.dialog.style.paddingRight = '20px';
            this.dialog.style.boxShadow = '-4px 0px 6px rgba(0, 0, 0, 0.1)';
            this.dialog.style.zIndex = '1000';
            this.dialog.style.overflowY = 'auto';
            this.dialog.style.fontSize = "large"

            // 创建文本内容元素
            this.textElement = document.createElement('p');
            this.textElement.textContent = text;
            this.dialog.appendChild(this.textElement);

            // 创建关闭按钮
            this.closeButton = document.createElement('button');
            this.closeButton.textContent = '关闭';
            this.closeButton.style.position = 'absolute';
            this.closeButton.style.top = '10px';
            this.closeButton.style.right = '10px';
            this.closeButton.style.padding = '5px 10px';
            this.closeButton.style.backgroundColor = '#f44336';
            this.closeButton.style.color = 'white';
            this.closeButton.style.border = 'none';
            this.closeButton.style.cursor = 'pointer';

            this.closeButton.addEventListener('click', () => {
                this.closeDialog();
            });

            this.dialog.appendChild(this.closeButton);

            // 将对话框添加到文档中
            document.body.appendChild(this.dialog);
        }

        // 更新对话框中的文本内容
        updateText(newText) {
            this.textElement.textContent = newText;
        }

        // 关闭对话框
        closeDialog() {
            if (this.dialog) {
                document.body.removeChild(this.dialog);
            }
        }
    }




    async function parseDocument() {

        // 获取当前页面的 URL
        const currentUrl = window.location.href;

        // 使用 Fetch API 获取文档内容
        const response = await fetch(currentUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        const text = await response.text();

        // 将文本解析为 DOM 对象
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        return new mozillareadability.Readability(doc).parse();
    }

    async function parseDocumentDOM() {

        // 获取当前页面的 URL

        return new mozillareadability.Readability(document).parse();
    }
    /*    async function summarize(text) {
        const openai = await import('https://cdn.jsdelivr.net/npm/openai@4.77.0/+esm');
        // 初始化 OpenAI 实例
        const client = new openai.OpenAI({
            baseURL: 'http://192.168.1.62:11434/v1',
            apiKey: 'ollama', // required but unused
            dangerouslyAllowBrowser: true
        });
        // 创建一个 completion 请求
        const completion = await client.chat.completions.create({
            model: 'qwen2.5',
            messages: [{ role: 'user', content: '总结以下内容:\n'+`abc` }],
        });
        console.log(completion.choices[0].message.content);
        return completion.choices[0].message.content;
    }*/

    async function summarize(text,dialog) {

        let body = {
            "model": "qwen2.5",
            "stream":true,
            "messages": [
                {
                    "role": "user",
                    "content": `请阅读以下文本，并用简洁明了的自然语言总结其核心内容和要点。确保总结准确反映文本的主要信息，并尽量简短，去除冗余细节。以下是要总结的文本：\n${text}`
        }
            ]
        };
        let reader;
        let responseText="";
        let str="";
        await GM.xmlHttpRequest({
            method: "POST",
            url: baseURL,
            data: JSON.stringify(body),
            responseType: "stream",
            onloadstart: async function (response) {
                console.log("Stream started...",response);
                reader = response.response.getReader();
                reader.read().then(function processText({ done, value }) {
                    if (done) {
                        console.log("Stream finished.");
                        return;
                    }
                    const chunk = new TextDecoder().decode(value);
                    if(chunk==="data: [DONE]"){
                        return
                    }
                    /*
                    let d = PartialJSON.parse(responseText)
                    if(d && d.choices && d.choices[0]&& d.choices[0].message && d.choices[0].message.content){
                        str = d.choices[0].message.content;
                    }*/
                    try{
                        const jsonString = chunk.replace(/^data: /, '');

                        const parsedObject = JSON.parse(jsonString);
                        str += parsedObject.choices[0].delta.content;
                        dialog.updateText(str);
                        console.log(str)
                    }
                    catch{

                    }

                    reader.read().then(processText);
                });
            },
            onerror: function (error) {
                console.error("Error in request:", error);

            },
            ontimeout: function () {
                console.error("Request timed out.");

            }
        });


        return str;
    }

    async function question(text,quest,dialog) {

        let body = {
            "model": "qwen2.5",
            "stream":true,
            "messages": [
                {
                    "role": "user",
                    "content": `**Prompt:**

**参考文本：**
${text}

**问题或要求：**
${quest}

**要求：**
- 根据参考文本提供的内容进行回答。
- 请确保答案准确、简洁，并包含参考文本中的关键信息。
- 如果有必要，可以对参考文本中的内容进行适当推理或补充，但不要偏离原始信息。
`
        }
            ]
        };
        let reader;
        let responseText="";
        let str="";
        await GM.xmlHttpRequest({
            method: "POST",
            url: baseURL,
            data: JSON.stringify(body),
            responseType: "stream",
            onloadstart: async function (response) {
                console.log("Stream started...",response);
                reader = response.response.getReader();
                reader.read().then(function processText({ done, value }) {
                    if (done) {
                        console.log("Stream finished.");
                        return;
                    }
                    const chunk = new TextDecoder().decode(value);
                    if(chunk==="data: [DONE]"){
                        return
                    }
                    /*
                    let d = PartialJSON.parse(responseText)
                    if(d && d.choices && d.choices[0]&& d.choices[0].message && d.choices[0].message.content){
                        str = d.choices[0].message.content;
                    }*/
                    try{
                        const jsonString = chunk.replace(/^data: /, '');

                        const parsedObject = JSON.parse(jsonString);
                        str += parsedObject.choices[0].delta.content;
                        dialog.updateText(str);
                        console.log(str)
                    }
                    catch{

                    }

                    reader.read().then(processText);
                });
            },
            onerror: function (error) {
                console.error("Error in request:", error);

            },
            ontimeout: function () {
                console.error("Request timed out.");

            }
        });


        return str;
    }
    GM_registerMenuCommand("总结整页", async () => {

        let dom = await parseDocument();
        console.log(dom)
        const dialog = new TextDialog("正在生成总结...");
        let summarize_ret = await summarize(JSON.stringify(dom),dialog);
        dialog.updateText(summarize_ret)
    });
    GM_registerMenuCommand("总结整页(损坏)", async () => {
        let dom = await parseDocumentDOM();
        console.log(dom)
        const dialog = new TextDialog("正在生成总结...");
        let summarize_ret = await summarize(JSON.stringify(dom),dialog);
        dialog.updateText(summarize_ret)
    });
    GM_registerMenuCommand("总结选中", async () => {

        var selectedText = window.getSelection().toString();
        if (selectedText) {
            console.log('Selected Text: ' + selectedText);
        }
        const dialog = new TextDialog("正在生成总结...");
        let summarize_ret = await summarize(selectedText,dialog);
        dialog.updateText(summarize_ret)
    });
    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim() !== '';
    }
    GM_registerMenuCommand("根据选中提问", async () => {

        var selectedText = window.getSelection().toString();
        if (selectedText) {
            console.log('Selected Text: ' + selectedText);
        }
        var quest = prompt("请输入问题或要求");
        if(isNonEmptyString(quest)){
            const dialog = new TextDialog("正在生成总结...");
            let summarize_ret = await question(selectedText,quest,dialog);
            dialog.updateText(summarize_ret)
        }
    });
    GM_registerMenuCommand("流测试", async () => {

        let body = {
            "model": "qwen2.5",
            "stream":true,
            "messages": [
                {
                    "role": "user",
                    "content": `随便介绍点什么`
        }

            ]
        };
        let reader;
        let responseText="";
        let str="";
        GM.xmlHttpRequest({
            method: "POST",
            url: baseURL,
            data: JSON.stringify(body),
            responseType: "stream",
            onloadstart: async function (response) {
                console.log("Stream started...",response);
                reader = response.response.getReader();
                reader.read().then(function processText({ done, value }) {
                    if (done) {
                        console.log("Stream finished.");
                        return;
                    }
                    const chunk = new TextDecoder().decode(value);
                    if(chunk==="data: [DONE]"){
                        return
                    }
                    /*
                    let d = PartialJSON.parse(responseText)
                    if(d && d.choices && d.choices[0]&& d.choices[0].message && d.choices[0].message.content){
                        str = d.choices[0].message.content;
                    }*/
                    try{
                        const jsonString = chunk.replace(/^data: /, '');

                        const parsedObject = JSON.parse(jsonString);
                        str += parsedObject.choices[0].delta.content;
                        console.log(str)
                    }
                    catch{

                    }

                    reader.read().then(processText);
                });
            },
            onerror: function (error) {
                console.error("Error in request:", error);

            },
            ontimeout: function () {
                console.error("Request timed out.");

            }
        });
    });
})();
