import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomerAuthService } from '../../auth/services/customer-auth.service';
import { SetPasswordDto } from '../dto/set-password.dto';

/**
 * Public storefront customer surface. The set-password endpoint is
 * unauthenticated — the single-use token *is* the credential.
 */
@ApiTags('Customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerAuth: CustomerAuthService) {}

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set an account password using a single-use token',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async setPassword(@Body() dto: SetPasswordDto) {
    const customer = await this.customerAuth.setPassword(
      dto.token,
      dto.password,
    );
    return { success: true, email: customer.email };
  }
}
