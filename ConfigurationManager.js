/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

define(function(require, exports, module) {
    "use strict";

    var ProjectFiles = require('ProjectFiles');
    var ConfigurationManager = {},
        configuration = {};


    function projectOpenDone( config ) {
        configuration = JSON.parse(config);
        $(ConfigurationManager).trigger("load", [configuration]);
    }

    function projectOpenFailed() {
        configuration = {};
        $(ConfigurationManager).trigger("load", [configuration]);
    }


    // Project settings for tomcat
    $(ProjectFiles).on("projectOpen", function() {
        $(ConfigurationManager).trigger("unload", [configuration]);

        ProjectFiles.openFile( ".tomcat-manager" )
            .done(function( file ) {
                file.read()
                    .done(projectOpenDone)
                    .fail(projectOpenFailed);
            })
            .fail(projectOpenFailed);
    });


    ConfigurationManager.getConfiguration = function( ) {
        return configuration;
    };


    ConfigurationManager.saveConfiguration = function() {
        ProjectFiles.openFile( ".tomcat-manager", "write", true )
            .done(function( fileWriter ) {
                fileWriter.write( JSON.stringify( configuration ) );
            })
            .fail(projectOpenFailed);
    };


    ConfigurationManager.getServersAsArray = function() {
        var result = [];
        var servers = (configuration.Servers || {});
        for ( var iServer in servers ) {
            if ( !servers.hasOwnProperty(iServer) ) {
                continue;
            }

            result.push(ConfigurationManager.getServer(iServer));
        }

        return result;
    };


    ConfigurationManager.getServers = function() {
        return (configuration.Servers || {});
    };


    ConfigurationManager.getAppServer = function( server ) {
        if ( typeof server === "string" ) {
            server = ConfigurationManager.getServer(server);
        }

        var appServers = configuration.AppServers || {};
        return appServers[server.AppServer];
    };


    ConfigurationManager.getServer = function( serverName ) {
        var server = (configuration.Servers || {})[serverName] || false;
        if (server) {
            server.name = serverName;
        }
        return server;
    };


    ConfigurationManager.getServerDetails = function( serverName ) {
        var server = ConfigurationManager.getServer(serverName);
        var appServer = ConfigurationManager.getAppServer(server);
        return $.extend({}, server, {"AppServer": appServer});
    };


    return ConfigurationManager;
});

