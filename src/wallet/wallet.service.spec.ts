import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletModel } from './entities/wallet.entity';
import { TransactionModel } from './entities/transaction.entity';
import { IdempotencyKeyModel } from './entities/idempotency-key.entity';

describe('WalletService', () => {
  let service: WalletService;

  const mockWalletModel = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  } as unknown as typeof WalletModel;

  const mockTxModel = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
  } as unknown as typeof TransactionModel;

  const mockIdempModel = {
    findByPk: jest.fn(),
    findOrCreate: jest.fn(),
  } as unknown as typeof IdempotencyKeyModel;

  const mockSequelize: any = {
    transaction: jest.fn((cb: any) =>
      cb({
        LOCK: { UPDATE: 'UPDATE' },
      }),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WalletService(mockWalletModel, mockTxModel, mockIdempModel, mockSequelize);
  });

  describe('createWallet', () => {
    it('should create wallet and wrap response', async () => {
      (mockWalletModel.create as jest.Mock).mockResolvedValue({
        id: 'w1',
        currency: 'USD',
        balance: 0,
        pin: '1234',
        transactions: [],
      });

      const res = await service.createWallet({ currency: 'USD', pin: '1234' });

      expect(mockWalletModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD', pin: '1234' }),
      );
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(201);
      expect(res.data).toMatchObject({ id: 'w1', balance: 0 });
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet and return wrapped response', async () => {
      const wallet = {
        id: 'w1',
        balance: 0,
        pin: '1234',
        save: jest.fn(),
      };
      (mockWalletModel.findByPk as jest.Mock).mockResolvedValue(wallet);
      (mockTxModel.create as jest.Mock).mockResolvedValue({});

      const spyLoad = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn<any, any>(service as any, 'loadWalletWithTransactions')
        .mockResolvedValue({
          id: 'w1',
          currency: 'USD',
          balance: 100,
          transactions: [],
        });

      const res = await service.fundWallet('w1', { amount: 100 });

      expect(mockSequelize.transaction).toHaveBeenCalled();
      expect(wallet.save).toHaveBeenCalled();
      expect(spyLoad).toHaveBeenCalledWith('w1', expect.anything());
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
      expect((res.data as any)?.balance).toBe(100);
    });

    it('should throw NotFound if wallet missing', async () => {
      (mockWalletModel.findByPk as jest.Mock).mockResolvedValue(null);

      const res = await service.fundWallet('missing', { amount: 50 });
      expect(res.status).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.message).toMatch(/wallet not found/i);
    });
  });

  describe('transfer', () => {
    it('should fail on same wallet transfer', async () => {
      const res = await service.transfer({
        fromWalletId: 'w1',
        toWalletId: 'w1',
        amount: 10,
        pin: '1234',
      });
      expect(res.status).toBe(false);
      expect(res.statusCode).toBe(400);
    });

    it('should fail on invalid PIN', async () => {
      (mockWalletModel.findAll as jest.Mock).mockResolvedValue([
        {
          id: 'from',
          balance: 100,
          pin: '9999',
          save: jest.fn(),
        },
        {
          id: 'to',
          balance: 0,
          pin: '1234',
          save: jest.fn(),
        },
      ]);

      const res = await service.transfer({
        fromWalletId: 'from',
        toWalletId: 'to',
        amount: 10,
        pin: '1234',
      });
      expect(res.status).toBe(false);
      expect(res.statusCode).toBe(400);
    });

    it('should perform transfer and wrap response', async () => {
      const fromWallet = {
        id: 'from',
        balance: 100,
        pin: '1234',
        save: jest.fn(),
      };
      const toWallet = {
        id: 'to',
        balance: 0,
        pin: '1234',
        save: jest.fn(),
      };

      (mockWalletModel.findAll as jest.Mock).mockResolvedValue([fromWallet, toWallet]);
      (mockTxModel.bulkCreate as jest.Mock).mockResolvedValue([]);

      const spyLoad = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn<any, any>(service as any, 'loadWalletWithTransactions')
        .mockResolvedValueOnce({
          id: 'from',
          currency: 'USD',
          balance: 90,
          transactions: [],
        })
        .mockResolvedValueOnce({
          id: 'to',
          currency: 'USD',
          balance: 10,
          transactions: [],
        });

      const res = await service.transfer({
        fromWalletId: 'from',
        toWalletId: 'to',
        amount: 10,
        pin: '1234',
      });

      expect(mockSequelize.transaction).toHaveBeenCalled();
      expect(fromWallet.save).toHaveBeenCalled();
      expect(toWallet.save).toHaveBeenCalled();
      expect(spyLoad).toHaveBeenCalledTimes(2);
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
      expect((res.data as any)?.from.balance).toBe(90);
      expect((res.data as any)?.to.balance).toBe(10);
    });
  });

  describe('getWalletSnapshot & getTransactions', () => {
    it('should return wrapped wallet snapshot', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn<any, any>(service as any, 'loadWalletWithTransactions').mockResolvedValue({
        id: 'w1',
        currency: 'USD',
        balance: 50,
        transactions: [],
      });

      const res = await service.getWalletSnapshot('w1');
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data?.wallet.id).toBe('w1');
    });

    it('should return wrapped transactions', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn<any, any>(service as any, 'loadWalletWithTransactions').mockResolvedValue({
        id: 'w1',
        currency: 'USD',
        balance: 50,
        transactions: [{ id: 't1' }],
      });

      const res = await service.getTransactions('w1');
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.data?.transactions).toHaveLength(1);
    });
  });

  describe('PIN operations', () => {
    it('should update PIN when oldPin matches', async () => {
      const wallet = { id: 'w1', pin: '1234', save: jest.fn() };
      (mockWalletModel.findByPk as jest.Mock).mockResolvedValue(wallet);

      const res = await service.updatePin('w1', { oldPin: '1234', newPin: '5678' });
      expect(wallet.save).toHaveBeenCalled();
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('should throw on invalid old PIN', async () => {
      const wallet = { id: 'w1', pin: '0000', save: jest.fn() };
      (mockWalletModel.findByPk as jest.Mock).mockResolvedValue(wallet);

      await expect(
        service.updatePin('w1', { oldPin: '1234', newPin: '5678' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reset PIN without checking oldPin', async () => {
      const wallet = { id: 'w1', pin: '0000', save: jest.fn() };
      (mockWalletModel.findByPk as jest.Mock).mockResolvedValue(wallet);

      const res = await service.resetPin('w1', { newPin: '5678' });
      expect(wallet.save).toHaveBeenCalled();
      expect(res.status).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });
});


