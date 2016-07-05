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
        node.sourcePathType = n.sourcePathType || "msg";
        node.sourceFilename = n.sourceFilename || "";
        node.sourceFilenameType = n.sourceFilenameType || "msg";
        node.destPath = n.destPath || "";
        node.destPathType = n.destPathType || "msg";
        node.destFilename = n.destFilename || "";
        node.destFilenameType = n.destFilenameType || "msg";
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

            if ((source.length > 0) && ((source.lastIndexOf('/') != source.length)) {
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
}

