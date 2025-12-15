import { createLogger, format, transports, addColors } from 'winston';

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

addColors(colors);

export const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize({
          all: true,
          colors: colors,
          level: true,
          message: true,
        }),
        format.timestamp({
          format: 'DD/MM/YYYY, HH:mm:ss',
        }),
        format.metadata(),
        format.align(),
        format.prettyPrint({
          colorize: true,
          depth: 10,
        }),
        format.printf(
          (info: any) =>
            `[Nest] ${info.level}  - ${info.metadata['timestamp']}  ${info.message}${info.metadata['message'] ? ' - ' + info.metadata['message'] : ''}${info.metadata['label'] ? ' - ' + info.metadata['label'] : ''}`,
        ),
      ),
      handleExceptions: true,
      // json: false,
      // colorize: true
    }),
  ],
});

