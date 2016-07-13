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
const path = require('path');


module.exports = function(RED) {
    "use strict";


    function setProperty(node, msg, name, type, value) {
        if (type === 'msg') {
            RED.util.setMessageProperty(msg,name,value);
        } else if (type === 'flow') {
            node.context().flow.set(name,value);
        } else if (type === 'global') {
            node.context().global.set(name,value);
        }
    }

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

            var source = RED.util.evaluateNodeProperty(node.sourcePath, node.sourcePathType, node, msg);
            if ((source.length > 0) && (source.lastIndexOf(path.sep) != source.length-1)) {
                source += path.sep;
            }
            source += RED.util.evaluateNodeProperty(node.sourceFilename, node.sourceFlenameType, node, msg);

            var dest = getProperty(node, msg, node.destPath, node.destPathType);
            if ((dest.length > 0) && (dest.lastIndexOf(path.sep) != dest.length-1)) {
                dest += path.sep;
            }
            dest += getProperty(node, msg, node.destFilename, node.destFilenameType);

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

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }
            pathname += RED.util.evaluateNodeProperty(node.sourceFilename, node.sourceFilenameType, node, msg);

            try {
                fs.unlinkSync(pathname);
            } catch (e) {
                if (e.errno == -21) {
                    // rmdir instead
                    try {
                        fs.rmdirSync(pathname);
                    } catch (ed) {
                        if (ed.errno != -2) {
                            // deleting non-existant directory is OK
                            node.error(ed, msg);
                            return null;
                        }
                    }
                } else if (e.errno != -2) {
                    // Deleting a non-existent file is not an error
                    node.error(e, msg);
                    return null;
                }
            }

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
        node.read = n.read;
        node.write = n.write;
        node.error = n.error;

        node.on("input", function(msg) {
            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }
            pathname += RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            var mode = fs.F_OK;
            if (node.read) mode |= fs.R_OK;
            if (node.write) mode |= fs.W_OK;

            try {
                fs.accessSync(pathname, mode);
            } catch (e) {
                if (node.error) node.error("File " + pathname + " is not accessible " + e, msg);
                if (msg.error) msg._error = Object.assign({}, msg.error);
                msg.error = {message: "File " + pathname + " is not accessible " + e};
                msg.error.source = {id: node.id, type: node.type, name: node.name};
                node.send([null, msg]);
                return null;
            }

            node.send([msg, null]);

        });
    }

    RED.nodes.registerType("fs-ops-access", AccessNode);


    function SizeNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filename = n.filename || "";
        node.filenameType = n.filenameType || "msg";
        node.size = n.size || "";
        node.sizeType = n.sizeType || "msg";

        node.on("input", function(msg) {

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }
            pathname += RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            var size = fs.statSync(pathname).size;

            setProperty(node, msg, node.size, node.sizeType, size);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-size", SizeNode);


    function DirNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filter = n.filter || "*";
        node.filterType = n.filterType || "msg";
        node.dir = n.dir || "";
        node.dirType = n.dirType || "msg";

        node.on("input", function(msg) {

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }

            var filter = RED.util.evaluateNodeProperty(node.filter, node.filterType, node, msg);


            filter = filter.replace('.', '\\.');
            filter = filter.replace('*', '.*');
            filter = new RegExp(filter);

            var dir = fs.readdirSync(pathname);
            dir = dir.filter(function(value) { return filter.test(value); });

            setProperty(node, msg, node.dir, node.dirType, dir);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-dir", DirNode);

    function MkdirNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.dirname = n.dirname || "";
        node.dirnameType = n.dirnameType || "msg";
        node.mode = parseInt(n.mode, 8);
        node.fullpath = n.fullpath || "";
        node.fullpathType = n.fullpathType || "msg";

        node.on("input", function(msg) {


            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }
            pathname += getProperty(node, msg, node.dirname, node.dirnameType);

            try {
                fs.mkdirSync(pathname, node.mode);
            } catch (e) {
                // Creating an existing directory is not an error
                if (e.errno != -17) {
                    node.error(e, msg);
                    return null;
                }
            }


            if (node.fullpath.length > 0) {
                setProperty(node, msg, node.fullpath, node.fullpathType, pathname);
            }

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-mkdir", MkdirNode);

    function MktmpdirNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.prefix = n.prefix || "";
        node.prefixType = n.prefixType || "msg";
        node.mode = parseInt(n.mode, 8);
        node.fullpath = n.fullpath || "";
        node.fullpathType = n.fullpathType || "msg";


        node.on("input", function(msg) {

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }
            pathname += RED.util.evaluateNodeProperty(node.prefix, node.prefixType, node, msg);

            if (fs.mkdtempSync) {
                pathname = fs.mkdtempSync(pathname, node.mode);

            } else {
                pathname += Math.random().toString(36).slice(2,8);
                fs.mkdir(pathname, node.mode);

            }

            setProperty(node, msg, node.fullpath, node.fullpathType, pathname);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-mktmpdir", MktmpdirNode);

}
