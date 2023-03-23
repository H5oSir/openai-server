import dotenv from 'dotenv-safe'
import express from 'express'
import parser from 'body-parser'
import morgan from 'morgan'
import Authenticator from "cgpt-token"
import { html2jpg } from './browser'

import { ChatGPTAPIBrowser, ChatResponse } from 'cgpt'

declare type JsonResponse = {
  json: (d: any) => void
  setHeader: (k: string, v: string) => void
  end: () => void
  write: (arr: Uint8Array) => void
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
  res.status(500)
}

function resultSuccess(res: JsonResponse, data: any) {
  res.setHeader("content-type", 'application/json; charset=utf-8')
  res.json({
    data,
    statusCode: 200
  })
}

function validateJsonHeader(req: Request, res: JsonResponse): boolean {
  const h = req.headers
  if (!h['content-type'] || !h['content-type'].includes('application/json')) {
    resultError(res, 'content-type must "application/json"')
    res.end()
    return false
  } else return true
}

async function auth(req: Request, res: JsonResponse) {
  if (!validateJsonHeader(req, res)) {
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
  if (!validateJsonHeader(req, res)) {
    return
  }

  if (!api) {
    resultError(res, 'BrowserLess is not initialization.')
    return
  }
  try {
    let nh = true
    const setHeaders = () => {
      if (nh) {
        nh = false
        res.setHeader("connection", "keep-alive")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("content-type", 'text/event-stream; charset=utf-8')
        req.on('aborted', () => {
          console.log('req.on(aborted) event-stream')
          api.newSignal(req.body?.messages?.[0]?.id).cancel()
        })
        req.socket.on('close', () => {
          console.log('req.socket.on(close) event-stream')
          api.newSignal(req.body?.messages?.[0]?.id).cancel()
        })
      }
    }

    const result = await api.sendMessage('hi', {
      onProgress: (partialResponse) => {
        const chunk = partialResponse.chunk??[]
        if (partialResponse.error) {
          resultError(res, partialResponse.error.message)
        } else {
          setHeaders()
          res.write(new Uint8Array(chunk))
        }
      },
      progressOptions: {
        parser: false,
        jsonBody: req.body,
        accessToken: h['authorization'].replace('Bearer ', '')
      }
    })

    if (result.error) {
      resultError(res, result.error.message)
    }
  } catch (err) {
    resultError(res, `${err}`)
  }
  res.end()
}


async function _html2jpg(req: Request, res: JsonResponse) {
  if (!validateJsonHeader(req, res)) {
    return
  }
  try {
    const { htmlText } = req.body
    const b64 = await html2jpg(htmlText)
    if (!b64) {
      resultError(req, `图片生成失败`)
    } else {
      resultSuccess(res, b64)
    }
  } catch(err) {
    resultError(req, `图片生成失败: ${err}`)
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
  app.post('/html2jpg', _html2jpg)
  app.listen(3000)
  console.log('http://127.0.0.1:3000')
  await initOpenai()
}

main()
.catch(err => console.log(err))

process.on('unhandledRejection', (reason, promise) => {
  console.log(reason)
})
