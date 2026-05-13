type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const IS_PROD = process.env.NODE_ENV === 'production'

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  if (IS_PROD && level === 'debug') return
  const timestamp = new Date().toISOString()
  const dataStr = data !== undefined ? ' ' + JSON.stringify(data) : ''
  const entry = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}${dataStr}`
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

export const logger = {
  info:  (module: string, msg: string, data?: unknown) => log('info',  module, msg, data),
  warn:  (module: string, msg: string, data?: unknown) => log('warn',  module, msg, data),
  error: (module: string, msg: string, data?: unknown) => log('error', module, msg, data),
  debug: (module: string, msg: string, data?: unknown) => log('debug', module, msg, data),
}
