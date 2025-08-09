const { asyncHandler } = require('../middleware/error.middleware');
const { AppError } = require('../middleware/error.middleware');
const AuthService = require('../services/AuthService');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    // Service will be injected via dependency injection
    this.authService = null;
  }

  setAuthService(authService) {
    this.authService = authService;
  }

  register = asyncHandler(async (req, res) => {
    const { tenantId } = req;
    const userData = req.body;

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.register(userData, tenantId);

    // Set cookies for tokens if desired
    if (result.tokens) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);
    }

    res.status(201).json({
      success: true,
      message: result.message,
      user: result.user,
      tokens: result.tokens,
    });
  });

  login = asyncHandler(async (req, res) => {
    const { tenantId } = req;
    const credentials = req.body;

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.login(credentials, tenantId, req);

    // Set cookies for tokens
    if (result.tokens) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      user: result.user,
      tokens: result.tokens,
    });
  });

  logout = asyncHandler(async (req, res) => {
    const { userId } = req;
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    await this.authService.logout(userId, refreshToken);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set new cookies
    if (result.tokens) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);
    }

    res.status(200).json({
      success: true,
      tokens: result.tokens,
      user: result.user,
    });
  });

  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const { tenantId } = req;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.forgotPassword(email, tenantId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const { tenantId } = req;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.resetPassword(token, newPassword, tenantId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const { tenantId } = req;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.verifyEmail(token, tenantId);

    res.status(200).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  });

  resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const { tenantId } = req;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.resendVerificationEmail(email, tenantId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { userId, tenantId } = req;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.changePassword(
      userId, 
      currentPassword, 
      newPassword, 
      tenantId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  validateToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token is required', 400);
    }

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.validateToken(token);

    res.status(200).json({
      success: true,
      valid: result.valid,
      user: result.user,
      error: result.error,
    });
  });

  getProfile = asyncHandler(async (req, res) => {
    const { user } = req;

    res.status(200).json({
      success: true,
      user,
    });
  });

  getUserSessions = asyncHandler(async (req, res) => {
    const { userId, tenantId } = req;

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.getUserSessions(userId, tenantId);

    res.status(200).json({
      success: true,
      sessions: result.sessions,
      lastLoginAt: result.lastLoginAt,
      loginCount: result.loginCount,
    });
  });

  revokeAllSessions = asyncHandler(async (req, res) => {
    const { userId, tenantId } = req;
    const currentToken = req.headers.authorization?.split(' ')[1];

    if (!this.authService) {
      throw new AppError('Auth service not available', 500);
    }

    const result = await this.authService.revokeAllSessions(
      userId, 
      tenantId, 
      currentToken
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}

module.exports = new AuthController();