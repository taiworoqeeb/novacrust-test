export type ResponsePayload<T = unknown> = {
  status: boolean;
  statusCode: number;
  message: string;
  data?: T;
};

export class ResponseHandler<T = unknown> implements ResponsePayload<T> {
  status: boolean;
  statusCode: number;
  message: string;
  data?: T;

  constructor(status: boolean, statusCode: number, message: string, data: T = {} as T) {
    this.status = status;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

export const responseHandler = <T = unknown>(payload: ResponsePayload<T> | ResponseHandler<T>) => ({
  ...payload,
});

