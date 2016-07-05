/**
 * Copyright 2016 Dean Cording <dean@cording.id.au>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 **/

const util = require('util');
const fs = require('fs');

module.exports = function(RED) {
    "use strict";

    function MoveNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.sourcePath = n.sourcePath || "";
        node.sourcePathType = n.sourcePathType || "str";
        node.sourceFilename = n.sourceFilename || "";
        node.sourceFilenameType = n.sourceFilenameType || "str";
        node.destPath = n.destPath || "";
        node.destPathType = n.destPathType || "str";
        node.destFilename = n.destFilename || "";
        node.destFilenameType = n.destFilenameType || "str";
        node.on("input", function(msg) {

            var source = "";
            var dest = "";

            if (node.sourcePathType === 'str') {
                source = node.sourcePath;
            } else if (node.sourcePathType === 'msg') {
                source = RED.util.getMessageProperty(msg,node.sourcePath).toString();
            } else if (node.sourcePathType === 'flow') {
                source = node.context().flow.get(node.sourcePath).toString();
            } else if (node.sourcePathType === 'global') {
                source = node.context().global.get(node.sourcePath).toString();
            }

            if ((source.length > 0) && (source.lastIndexOf('/') != source.length)) {
                source += '/';
            }

            if (node.sourceFilenameType === 'str') {
                source += node.sourceFilename;
            } else if (node.sourceFilenameType === 'msg') {
                source += RED.util.getMessageProperty(msg,node.sourceFilename).toString();
            } else if (node.sourceFilenameType === 'flow') {
                source += node.context().flow.get(node.sourceFilename).toString();
            } else if (node.sourceFilenameType === 'global') {
                source += node.context().global.get(node.sourceFilename).toString();
            }

            if (node.destPathType === 'str') {
                dest = node.destPath;
            } else if (node.destPathType === 'msg') {
                dest = RED.util.getMessageProperty(msg,node.destPath).toString();
            } else if (node.destPathType === 'flow') {
                dest = node.context().flow.get(node.destPath).toString();
            } else if (node.destPathType === 'global') {
                dest = node.context().global.get(node.destPath).toString();
            }

            if ((dest.length > 0) && (dest.lastIndexOf('/') != dest.length)) {
                dest += '/';
            }

            if (node.destFilenameType === 'str') {
                dest += node.destFilename;
            } else if (node.destFilenameType === 'msg') {
                dest += RED.util.getMessageProperty(msg,node.destFilename).toString();
            } else if (node.destFilenameType === 'flow') {
                dest += node.context().flow.get(node.destFilename).toString();
            } else if (node.destFilenameType === 'global') {
                dest += node.context().global.get(node.destFilename).toString();
            }

            fs.renameSync(source, dest);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-move", MoveNode);

    function DeleteNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filename = n.filename || "";
        node.filenameType = n.filenameType || "msg";

        node.on("input", function(msg) {

            var pathname = "";

            if (node.pathType === 'str') {
                pathname = node.path;
            } else if (node.pathType === 'msg') {
                pathname = RED.util.getMessageProperty(msg,node.path).toString();
            } else if (node.pathType === 'flow') {
                pathname = node.context().flow.get(node.path).toString();
            } else if (node.pathType === 'global') {
                pathname = node.context().global.get(node.path).toString();
            }

            if ((pathname.length > 0) && (pathname.lastIndexOf('/') != pathname.length)) {
                pathname += '/';
            }

            if (node.filenameType === 'str') {
                pathname += node.filename;
            } else if (node.filenameType === 'msg') {
                pathname += RED.util.getMessageProperty(msg,node.filename).toString();
            } else if (node.filenameType === 'flow') {
                pathname += node.context().flow.get(node.filename).toString();
            } else if (node.filenameType === 'global') {
                pathname += node.context().global.get(node.filename).toString();
            }


            fs.unlinkSync(pathname);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-delete", DeleteNode);

    function AccessNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filename = n.filename || "";
        node.filenameType = n.filenameType || "str";
        node.read = n.read || 1;
        node.write = n.write || 1;

        node.on("input", function(msg) {

            var pathname = "";

            if (node.pathType === 'str') {
                pathname = node.path;
            } else if (node.pathType === 'msg') {
                pathname = RED.util.getMessageProperty(msg,node.path).toString();
            } else if (node.pathType === 'flow') {
                pathname = node.context().flow.get(node.path).toString();
            } else if (node.pathType === 'global') {
                pathname = node.context().global.get(node.path).toString();
            }

            if ((pathname.length > 0) && (pathname.lastIndexOf('/') != pathname.length)) {
                pathname += '/';
            }

            if (node.filenameType === 'str') {
                pathname += node.filename;
            } else if (node.filenameType === 'msg') {
                pathname += RED.util.getMessageProperty(msg,node.filename).toString();
            } else if (node.filenameType === 'flow') {
                pathname += node.context().flow.get(node.filename).toString();
            } else if (node.filenameType === 'global') {
                pathname += node.context().global.get(node.filename).toString();
            }

            var mode = fs.F_OK | (fs.R_OK * node.read) | (fs.W_OK * node.write);

            try {
                fs.accessSync(pathname, mode);
            } catch (e) {
                node.error("File not accessible", msg);
                return;
            }

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-access", AccessNode);

}

