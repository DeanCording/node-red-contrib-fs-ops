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
        node.link = n.link;

        if (node.link === undefined) node.link = false;

        node.on("input", function(msg) {

            var source = RED.util.evaluateNodeProperty(node.sourcePath, node.sourcePathType, node, msg);
            if ((source.length > 0) && (source.lastIndexOf(path.sep) != source.length-1)) {
                source += path.sep;
            }
            source += RED.util.evaluateNodeProperty(node.sourceFilename, node.sourceFilenameType, node, msg);

            var dest = RED.util.evaluateNodeProperty(node.destPath, node.destPathType, node, msg);
            if ((dest.length > 0) && (dest.lastIndexOf(path.sep) != dest.length-1)) {
                dest += path.sep;
            }
            dest += RED.util.evaluateNodeProperty(node.destFilename, node.destFilenameType, node, msg);

            if (node.link) {
                try {
                    fs.symlinkSync(source,dest);
                } catch (e) {
                    node.error(e, msg);
                    return;
                }
            } else {
                try {
                    fs.renameSync(source, dest);
                } catch (e) {
                    if (e.code === 'EXDEV') {
                        // Cross devices move - need to copy and delete
                        try {
                            // fs.pipe doesn't seem to handle exceptions properly
                            // Need to check we can access files
                            fs.accessSync(source, fs.R_OK | fs.W_OK);
                            fs.accessSync(dest, fs.W_OK);
                            var is = fs.createReadStream(source);
                            var os = fs.createWriteStream(dest);
                            is.on('end', function() {
                                try {
                                    fs.unlinkSync(source);
                                } catch (e) {
                                    node.error(e, msg);
                                    return;
                                }
                                node.send(msg);
                            });

                            is.pipe(os);
                            return;

                        } catch (e) {
                            node.error(e, msg);
                            return;
                        }

                    } else {
                        node.error(e, msg);
                        return;
                    }
                }
            }

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
            pathname += RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            try {
                fs.unlinkSync(pathname);
            } catch (e) {
                if (e.code === 'EISDIR') {
                    // rmdir instead
                    try {
                        fs.rmdirSync(pathname);
                    } catch (ed) {
                        if (ed.code != 'ENOENT') {
                            // deleting non-existent directory is OK
                            node.error(ed, msg);
                            return;
                        }
                    }
                } else if (e.code != 'ENOENT') {
                    // Deleting a non-existent file is not an error
                    node.error(e, msg);
                    return;
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
        node.throwerror = n.throwerror;

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
                if (node.throwerror) node.error("File " + pathname + " is not accessible " + e, msg);
                if (msg.error) msg._error = Object.assign({}, msg.error);
                msg.error = {message: "File " + pathname + " is not accessible " + e};
                msg.error.source = {id: node.id, type: node.type, name: node.name};
                node.send([null, msg]);
                return;
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

            var filename = RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            var size;

            try {
                if (Array.isArray(filename)) {
                    size = [];
                    filename.forEach(function(file) {
                        size.push(fs.statSync(pathname + file).size);
                    });
                } else {
                    size = fs.statSync(pathname + filename).size;
                }
            } catch (e) {
                node.error(e,msg);
                return;
            }

            setProperty(node, msg, node.size, node.sizeType, size);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-size", SizeNode);


    function LinkNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filename = n.filename || "";
        node.filenameType = n.filenameType || "msg";
        node.link = n.link || "";
        node.linkType = n.linkType || "msg";

        node.on("input", function(msg) {

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);

            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }

            var filename = RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            var link;

            if (Array.isArray(filename)) {
                link = [];
                filename.forEach(function(file) {
                    try {
                        link.push(fs.readlinkSync(pathname + file));
                    } catch (e) {
                        if (e.code === 'EINVAL') {
                            link.push('');
                        } else {
                            node.error(e, msg);
                            return;
                        }
                    }
                });
            } else {
                try {
                    link = fs.readlinkSync(pathname + filename);
                } catch (e) {
                    if (e.code === 'EINVAL') {
                        link = '';
                    } else {
                        node.error(e, msg);
                        return;
                    }
                }
            }

            setProperty(node, msg, node.link, node.linkType, link);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-link", LinkNode);


    function TypeNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.name = n.name;
        node.path = n.path || "";
        node.pathType = n.pathType || "str";
        node.filename = n.filename || "";
        node.filenameType = n.filenameType || "msg";
        node.filetype = n.filetype || "";
        node.filetypeType = n.filetypeType || "msg";

        function getType(filetype) {
            if (filetype.isFile()) return 'F';
            if (filetype.isDirectory()) return 'D';
            if (filetype.isCharacterDevice()) return 'C';
            return 'S';
        }

        node.on("input", function(msg) {

            var pathname = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);

            if ((pathname.length > 0) && (pathname.lastIndexOf(path.sep) != pathname.length-1)) {
                pathname += path.sep;
            }

            var filename = RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            var filetype;

            try {
                if (Array.isArray(filename)) {
                    filetype = [];
                    filename.forEach(function(file) {
                        filetype.push(getType(fs.statSync(pathname + file)));
                    });
                } else {
                    filetype = getType(fs.lstatSync(pathname + filename));
                }
            } catch (e) {
                node.error(e, msg);
                return;
            }

            setProperty(node, msg, node.filetype, node.filetypeType, filetype);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-type", TypeNode);



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

            try {
                var dir = fs.readdirSync(pathname);
                dir = dir.filter(function(value) { return filter.test(value); });
            } catch (e) {
                node.error(e, msg);
                return;
            }

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
            pathname += RED.util.evaluateNodeProperty(node.dirname, node.dirnameType, node, msg);

            try {
                fs.mkdirSync(pathname, node.mode);
            } catch (e) {
                // Creating an existing directory is not an error
                if (e.code != 'EEXIST') {
                    node.error(e, msg);
                    return;
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

            try {
                if (fs.mkdtempSync) {
                    pathname = fs.mkdtempSync(pathname, node.mode);

                } else {
                    pathname += Math.random().toString(36).slice(2,8);
                    fs.mkdirSync(pathname, node.mode);

                }
            } catch (e) {
                node.error(e, msg);
                return;
            }

            setProperty(node, msg, node.fullpath, node.fullpathType, pathname);

            node.send(msg);

        });
    }

    RED.nodes.registerType("fs-ops-mktmpdir", MktmpdirNode);

}

