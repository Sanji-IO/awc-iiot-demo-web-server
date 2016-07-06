# awc-iiot-demo-web-server

## Install Instructions
Install node.js on ubuntu or debian.
1. `wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash`
2. `nvm install 4`
3. `npm update -g npm`

## Get Started
1. `git clone https://github.com/Sanji-IO/awc-iiot-demo-web-server.git`
2. change folder to `awc-iiot-demo-web-server` and execute `npm install --production`
3. `NODE_ENV=production DB_SERVER=your_db_server_name DB_USER=your_db_username DB_PWD=your_db_password DB_HOST=your_db_hostname npm start`
