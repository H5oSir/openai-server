import dotenv from 'dotenv-safe'
import express from 'express'
import parser from 'body-parser'
import morgan from 'morgan'
import Authenticator from "cgpt-token"
// import ProxyAgent from 'https-proxy-agent'
// import https from 'https'

import { ChatGPTAPIBrowser, ChatResponse } from 'cgpt'

declare type JsonResponse = {
  json: (d: any) => void
  setHeader: (k: string, v: string) => void
  end: () => void
} & Response

dotenv.config()
const OPENAI_EMAIL = process.env.OPENAI_EMAIL
const OPENAI_PASSWORD = process.env.OPENAI_PASSWORD
const OPENAI_PROXY = process.env.OPENAI_PROXY

function resultError(res: JsonResponse, statusText: string) {
  res.setHeader("content-type", 'application/json; charset=utf-8')
  res.json({
    statusText,
    statusCode: 500
  })
}

function resultSuccess(res: JsonResponse, data: any) {
  res.setHeader("content-type", 'application/json; charset=utf-8')
  res.json({
    data,
    statusCode: 200
  })
}

async function auth(req: Request, res: JsonResponse) {
  const h = req.headers
  if (!h['content-type'] || !h['content-type'].includes('application/json')) {
    resultError(res, 'content-type must "application/json"')
    return
  }

  const { email, passwd } = (req.body as any)
  const auth = new Authenticator(email, passwd, OPENAI_PROXY)
  await auth.begin()
  const token = await auth.getAccessToken()
  // console.log(token)
  if (token) {
    resultSuccess(res, token)
  } else {
    resultError(res, 'Authention fail, please check you account!')
  }
}

async function conversation(req: Request, res: JsonResponse) {
  const h = req.headers
  if (!h['content-type'] || !h['content-type'].includes('application/json')) {
    resultError(res, 'content-type must "application/json"')
    return
  }
  // const url = "https://chat.openai.com/backend-api/conversation"
  // const options = {
  //   // protocol: 'https:',
  //   // hostname: 'chat.openai.com',
  //   // port: '443',
  //   // method: "POST",
  //   // path: '/backend-api/conversation',
  //   headers: {
  //     'accept': '*/*',
  //     'x-openai-assistant-app-id': '',
  //     'referer': 'https://chat.openai.com/chat',
  //     'content-type': 'application/json',
  //     'cache-control': 'no-cache',
  //     'connection': 'keep-alive',
  //     'keep-alive': 'timeout=360',
  //     'user-agent': 'Mozilla/5.0 (X11 Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  //     'authorization': h['authorization'],
  //     'sec-ch-ua': '"Microsoft Edge";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
  //     'sec-ch-ua-platform': '"macOS"',
  //     'sec-fetch-dest': 'empty',
  //     'sec-fetch-mode': 'cors',
  //     'sec-fetch-site': 'none',
  //     'cookie': 'cf_clearance=jceMfVSIkVA0.gcPiyS0n2HVv3NKCShUVGfTTNOfZ0w-1679335297-0-1-578f6fef.91314e09.8e300f-250'
  //   },
  //   agent: new ProxyAgent('http://127.0.0.1:7890')
  // }
  // const ajax = https.request(url, options, r => {
  //   res.setHeader("content-type", r.headers['content-type'])
  //   r.on('data', chunk => {
  //     // console.log([...chunk])
  //     res.write(chunk)
  //   })
  //   r.on('end', () => res.end())
  // })
  // ajax.write(JSON.stringify(req.body))
  // ajax.on('error', error => {
  //   console.log('error', error)
  //   res.end()
  // })
  // ajax.end()
  // ============================
  if (!api) {
    resultError(res, 'BrowserLess is not initialization.')
    return
  }

  try {
    let needHeader = true
    const result = await api.sendMessage('hi', {
      parser: false,
      accessToken: h['authorization'].replace('Bearer ', ''),
      onProgress: (partialResponse) => {
        const chunk = partialResponse.chunk??[]
        if (partialResponse.error) {
          resultError(res, partialResponse.error.message)
        } else {
          if (needHeader) {
            needHeader = false
            res.setHeader("content-type", 'text/event-stream; charset=utf-8')
          }
          (res as any).write(new Uint8Array(chunk))
        }
      },
      jsonBody: req.body
    })

    if (result.error) {
      resultError(res, result.error.message)
    }
  } catch (err) {
    resultError(res, `${err}`)
  }
  res.end()
}


let api: ChatGPTAPIBrowser | null = null
async function initOpenai() {
  if (!api) {
    console.log(
      'Login By ' + OPENAI_EMAIL + '\n' +
      'Proxy Server http://' + OPENAI_PROXY + '\n'
    )
    api = new ChatGPTAPIBrowser({
      debug: false,
      email: OPENAI_EMAIL??"",
      password: OPENAI_PASSWORD??"",
      proxyServer: OPENAI_PROXY ? 'http://' + OPENAI_PROXY : undefined
    })
    await api.initSession()
    console.log('ChatGPTAPI initialize success !')
  }
}

async function main() {
  const app: any = express()
  app.use(parser.json({ limit: '10mb' }))
  app.use(parser.urlencoded({ extended: true }))
  app.use(morgan('dev'))
  app.post('/auth', auth)
  app.post('/conversation', conversation)
  app.listen(3000)
  console.log('http://127.0.0.1:3000')
  await initOpenai()
}

main()
.catch(err => console.log(err))

process.on('unhandledRejection', (reason, promise) => {
  console.log(reason)
})
