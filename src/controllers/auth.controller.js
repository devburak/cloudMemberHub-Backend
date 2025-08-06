const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuthService = require("../services/AuthService");
const { AppError, asyncHandler } = require("../middleware/error.middleware");
const { result } = require("lodash");

const register = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const userData = req.body;

  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService(userData, tenantId);

  res.status(201).json({
    success: true,
    message: result.message,
    user: result.user,
    tokens: result.tokens,
  })
})

const login = asyncHandler(async (req, res) => {
  const credentials = req.body;
  const { tenantId } = req;

  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.login(credentials, tenantId);

  res.status(200).json({
    success: true,
    message: result.message,
    user: result.user,
    tokens: result.tokens,
  })
})

const logout = asyncHandler(async (req, res) => {
  const { userId } = req;
  const refreshToken = req;
  
  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.logout(userId, refreshToken);

  res.status(200).json({
    success: true,
    message: result?.message || 'Logged out successfully',
  });
})

const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.refreshToken;

  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.refreshToken(refreshToken);

  res.status(200).json({
    success: true,
    tokens: result.tokens,
    user: result.user,
  })
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const email = req.body;

  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.forgotPassword(email, tenantId);

  res.status(200).json({
    success: true,
    message: result.message,
  })
})

const resetPassword = asyncHandler(async (req, res) => {
  const { tenantId } = req;
  const token = req.params.token;
  const password = req.body;

if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.resetPassword(token, password, tenantId);

  res.status(200).json({
    success: true,
    message: result.message,
  });

})

const verifyEmail = asyncHandler( async (req, res) => {
  const token = req;
  const { tenantId } = req;

  if(!this.AuthService) {
    throw new AppError('Auth service is not available', 500);
  }

  const result = await this.AuthService.verifyEmail(token, tenantId);

  res.status(200).json({
    success: true,
    user: result.user,
    message: result.message,
  });

})


module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
}
