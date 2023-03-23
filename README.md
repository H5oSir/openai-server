### 说明

这是一个简易的web chatgpt代理服务器

用于代理openai在线`https://chat.openai.com/chat` 中的聊天请求



### 启动

#### 1.源码启动



安装docker

// 略...    (自行百度)

下载或git clone

```shell
curl -o https://github.com/bincooo/openai-server/archive/refs/heads/main.zip
// or
git clone https://github.com/bincooo/openai-server.git
```



修改配置 `.env`, 没有这文件就创建

```shell
vim .env
```

```shell
// 科学上网地址
// 根据个人需求填写，如果你服务器无法访问openai就要配置这个
OPENAI_PROXY=[ip]:[port]
// 邮箱账号
OPENAI_EMAIL=[email]
// 登录密码
OPENAI_PASSWORD=[password]
```

修改配置 `docker-compose.yaml`, `extra_hosts`下的ip修改为你自己电脑的ip，window 用`ipconfig`命令查看，linux 用 `ifconfig`命令查看

```shell
vim docker-compose.yaml
```

```dockerfile
version: '3.9'
services:
  test:
    build: .
    image: openai-server:latest
    restart: always
    ports:
      - 5900:5900
      - 3000:3000
    volumes:
      - ./src:/app/src
    extra_hosts:
      - "master.io:192.168.0.230"
```





启动

```shell
cd openai-server
docker compose up -d --build
```

控制台显示如下，即登录成功

```shell
http://127.0.0.1:3000
Login By xxxxxx@outlook.com
Proxy Server http://master.io:7890

ChatGPTAPI initialize success !
```



等待过程中如果长时间不出现  `ChatGPTAPI initialize success !`.  可以使用vnc连接进入容器查看登录情况

推荐连接工具：（端口默认 5900，不需要密码）

window： `vnc viewer`

MacOS、Linux： `Royal TSX`

连接后可查看浏览器运行情况

<img src="static/截屏2023-03-22 05.55.18.png" alt="截屏2023-03-22 05.55.18" style="zoom: 50%;" />







#### 2.镜像启动

创建文件夹, 名字随意

```shell
mkdir openai-server
cd openai-server
```

创建 `docker-compose.yaml`

```shell
vim docker-compose.yaml
```

注意修改 `extra_hosts` 的ip

```dockerfile
version: '3.9'
services:
  test:
    image: bincooo/openai-server:v1.0.0
    restart: always
    ports:
      - 5900:5900
      - 3000:3000
    volumes:
      - .env:/app/.env
    extra_hosts:
      - "master.io:10.0.20.17"
```

```shell
docker compose up -d
```



创建 `.vnc`

```shell
vim .vnc
```

```shell
// 科学上网地址
// 根据个人需求填写，如果你服务器无法访问openai就要配置这个
OPENAI_PROXY=[ip]:[port]
// 邮箱账号
OPENAI_EMAIL=[email]
// 登录密码
OPENAI_PASSWORD=[password]
```





### 使用API

 发送http协议

1. 获取 `accessToken`

   ```tex
   http://[ip]:5000/auth
   ```

   

```http
POST /auth HTTP/1.1
Content-Length: 62
Content-Type: application/json
Host: [ip]:5000
{
"email": "xxxxxx@outlook.com",
"passwd": "xxxxxx"
}
```

​	返回结果

```json
{
  "data": "[accessToken]",
  "statusCode": 200
}
```

2. 代理聊天请求

   ```tex
   http://[ip]:5000/conversation
   ```

   

```http
POST /conversation HTTP/1.1
Authorization: Bearer [accessToken]
Content-Type: application/json
Host: [ip]:5000
{
  "action":"next",
  "messages":[
    {
      "id":"75001e62-6ef5-41bd-9ad8-6348430e7723",
      "author":{
        "role":"user"
      },
      "role":"user",
      "content":{
        "content_type":"text",
        "parts":["你好"]
      }
    }],
  "parent_message_id":"c7812e2b-3e46-4977-9794-f149807f595a",
  "model":"text-davinci-002-render"
}
```

3. html转jpg

   ```tex
   http://[ip]:5000/html2jpg
   ```

```http
POST /html2jpg HTTP/1.1
Content-Type: application/json
Host: [ip]:5000
{
  "htmlText":"xxxxx"
}
```

​	返回结果

```http
{
  "data": "[base64]",
  "statusCode": 200
}
```

```http
{
  "statusText": "[error message]",
  "statusCode": 500
}
```

