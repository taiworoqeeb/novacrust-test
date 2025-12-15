import { Body, Controller, Get, HttpStatus, Next, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferDto } from './dto/transfer.dto';
import { UpdatePinDto } from './dto/update-pin.dto';
import { ResetPinDto } from './dto/reset-pin.dto';
import { logger } from '../utils/logger';

@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  async createWallet(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() dto: CreateWalletDto,
  ) {
    try {
      const response = await this.walletService.createWallet(dto);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Post(':id/fund')
  async fundWallet(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('id') id: string,
    @Body() data: FundWalletDto,
  ) {
    try {
      const response = await this.walletService.fundWallet(id, data);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Post('transfer')
  async transfer(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Body() data: TransferDto,
  ) {
    try {
      const response = await this.walletService.transfer(data);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      console.log(error);
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Get(':id/get-wallet')
  async getWallet(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('id') id: string,
  ) {
    try {
      const response = await this.walletService.getWalletSnapshot(id);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Get(':id/transactions')
  async getTransactions(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('id') id: string,
  ) {
    try {
      const response = await this.walletService.getTransactions(id);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Post(':id/pin/update')
  async updatePin(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('id') id: string,
    @Body() dto: UpdatePinDto,
  ) {
    try {
      const response = await this.walletService.updatePin(id, dto);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }

  @Post(':id/pin/reset')
  async resetPin(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Param('id') id: string,
    @Body() dto: ResetPinDto,
  ) {
    try {
      const response = await this.walletService.resetPin(id, dto);
      return res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error((error as Error).message, {
        statusCode: (error as any).status || 500,
        route: req.originalUrl,
        method: req.method,
        error,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: (error as Error).message,
        data: {},
      });
      next(error);
    }
  }
}

