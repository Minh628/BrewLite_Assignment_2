import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { VnpayService } from './vnpay.service';

// Giá trị giả chỉ dùng cho test — không phải thông tin merchant thật
const TEST_TMN_CODE = 'TESTTMN1';
const TEST_HASH_SECRET = 'test-only-hash-secret-not-real';

describe('VnpayService (VNPay Sandbox v2.1.0)', () => {
  let service: VnpayService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VNP_TMN_CODE = TEST_TMN_CODE;
    process.env.VNP_HASH_SECRET = TEST_HASH_SECRET;
    service = new VnpayService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('khi chưa cấu hình VNP_TMN_CODE / VNP_HASH_SECRET', () => {
    beforeEach(() => {
      delete process.env.VNP_TMN_CODE;
      delete process.env.VNP_HASH_SECRET;
      service = new VnpayService();
    });

    it('từ chối tạo URL thanh toán (503)', () => {
      expect(service.isConfigured()).toBe(false);
      expect(() =>
        service.createPaymentUrl({ orderId: 1, amount: 10000, method: PaymentMethod.CARD }),
      ).toThrow(ServiceUnavailableException);
    });

    it('luôn coi callback là không hợp lệ, kể cả khi ký bằng khóa rỗng', () => {
      const verify = service.verifyCallback({
        vnp_Amount: '100000',
        vnp_TxnRef: '1XCARDX123',
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'anything',
      });
      expect(verify.isValid).toBe(false);
    });
  });

  it('tạo URL thanh toán có chữ ký HMAC-SHA512 và tham số đặc tả v2.1.0', () => {
    const url = service.createPaymentUrl({
      orderId: 1014,
      amount: 45000,
      method: PaymentMethod.CARD,
      ipAddr: '127.0.0.1',
    });

    expect(url).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?');
    expect(url).toContain('vnp_Version=2.1.0');
    expect(url).toContain('vnp_Command=pay');
    expect(url).toContain(`vnp_TmnCode=${TEST_TMN_CODE}`);
    expect(url).toContain('vnp_Amount=4500000'); // 45000 * 100
    expect(url).toContain('vnp_TxnRef=1014XCARDX');
    expect(url).toContain('vnp_SecureHash=');
  });

  it('xác thực chữ ký hợp lệ và bóc tách đúng orderId, method', () => {
    const url = service.createPaymentUrl({
      orderId: 2025,
      amount: 70000,
      method: PaymentMethod.WALLET,
      ipAddr: '::1', // test IPv6 localhost mapping
    });

    // Parse query params từ URL vừa sinh
    const urlObj = new URL(url);
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    // Giả lập VNPay trả về kết quả thành công
    queryParams['vnp_ResponseCode'] = '00';
    queryParams['vnp_TransactionStatus'] = '00';
    queryParams['vnp_TransactionNo'] = '14567890';

    // Ký lại với query mới
    const verify = service.verifyCallback(queryParams);
    expect(verify.orderId).toBe(2025);
    expect(verify.method).toBe(PaymentMethod.WALLET);
    expect(verify.amount).toBe(70000);
    expect(verify.isSuccess).toBe(true);
  });

  it('phát hiện chữ ký giả mạo (Fail checksum)', () => {
    const fakeQuery = {
      vnp_Amount: '100000',
      vnp_TxnRef: '1014MCARDT123456',
      vnp_ResponseCode: '00',
      vnp_SecureHash: 'fake_hash_123456789abcdef',
    };

    const verify = service.verifyCallback(fakeQuery);
    expect(verify.isValid).toBe(false);
  });
});
