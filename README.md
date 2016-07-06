# awc-iiot-demo-web-server
This is a demo project for awc. The demo server receives ThingsPro upload json data and insert data to SQL Server.

## Architecture
![Demo Architecture](https://dl.dropboxusercontent.com/u/16706203/demo-architecture.png)

## Features
- HTTP basic authentication
- Insert upload data to specific DB.

## How to Setup
### Azure SQL Server
In market place search `SQL Database` service and build follow instruction. Remember to setup firewall rule.
![Azure SQL Server](https://dl.dropboxusercontent.com/u/16706203/sql-server.png)

### Demo Web Server Setup
Install node.js on Azure Ubuntu VM.

1. Create Ubuntu VM and launch
2. ssh login
3. `wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash`
4. `nvm install 4`
5. `npm update -g npm`
6. `git clone https://github.com/Sanji-IO/awc-iiot-demo-web-server.git`
7. change folder to `awc-iiot-demo-web-server` and execute `npm install --production`
8. `NODE_ENV=production DB_SERVER=your_db_server_name DB_USER=your_db_username DB_PWD=your_db_password DB_HOST=your_db_hostname npm start`
