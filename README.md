Brackets-TomcatManager
======================

Start and stop tomcat servers and view in the tomcat manager console messages from the tomcat instance.
<br>


TODO:
======================
- Save running tomcat instances in .tomcat-manager to keep track of running instances, even after brackets has been closed.
- Add UI to allow users to configure tomcat instances.

Creating config files
======================
- Currently, config files can only be created manually.  This isn't difficult but it requires some explenation.  Hopefully soon, I will provide a UI so that this manual work isn't needed anymore.<br>
- First of all, configuration files are per project.  So, the first thing we have to do is create a files ".tomcat-manager".  Please see https://github.com/MiguelCastillo/Brackets-TomcatManager/blob/master/.tomcat-manager for a sample. <br><br>
  
The are two primary pieces of information in a configuration file: <br>
1. Servers, which is a hash of servers.  Currently, each server maps to app servers which is how TomcatManager figures out where to find tomcat executables.
2. AppServers, which is a hash of application servers.  The only property currently used in an application server is the path, which is the root directory of tomcat.
<br><br>
Please see https://github.com/MiguelCastillo/Brackets-TomcatManager/blob/master/.tomcat-manager
<br>

License
=====================
Licensed under MIT
