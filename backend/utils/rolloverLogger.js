/**
 * Rollover Operation Logger
 * Centralized logging for all rollover-related operations
 */

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const currentLevel = process.env.LOG_LEVEL || 'info'

/**
 * Format log entry
 */
function formatLog(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: 'rollover-management',
    message,
    ...data
  }
}

/**
 * Log error level messages
 */
export function error(message, data = {}) {
  if (logLevels.error <= logLevels[currentLevel]) {
    console.error(JSON.stringify(formatLog('error', message, data)))
  }
}

/**
 * Log warning level messages
 */
export function warn(message, data = {}) {
  if (logLevels.warn <= logLevels[currentLevel]) {
    console.warn(JSON.stringify(formatLog('warn', message, data)))
  }
}

/**
 * Log info level messages
 */
export function info(message, data = {}) {
  if (logLevels.info <= logLevels[currentLevel]) {
    console.log(JSON.stringify(formatLog('info', message, data)))
  }
}

/**
 * Log debug level messages
 */
export function debug(message, data = {}) {
  if (logLevels.debug <= logLevels[currentLevel]) {
    console.log(JSON.stringify(formatLog('debug', message, data)))
  }
}

/**
 * Log rollover creation
 */
export function logRolloverCreated(rollover) {
  info('Rollover request created', {
    rolloverId: rollover._id || rollover.id,
    memberId: rollover.memberId,
    memberName: rollover.memberName,
    originalPrincipal: rollover.originalPrincipal,
    newTenure: rollover.newTenure,
    newInterestRate: rollover.newInterestRate
  })
}

/**
 * Log rollover approval
 */
export function logRolloverApproved(rollover, adminId) {
  info('Rollover approved', {
    rolloverId: rollover._id || rollover.id,
    memberId: rollover.memberId,
    memberName: rollover.memberName,
    newLoanId: rollover.newLoanId,
    approvedBy: adminId,
    newTerms: {
      tenure: rollover.newTenure,
      interestRate: rollover.newInterestRate,
      monthlyRepayment: rollover.newMonthlyRepayment
    }
  })
}

/**
 * Log rollover rejection
 */
export function logRolloverRejected(rollover, adminId, reason) {
  warn('Rollover rejected', {
    rolloverId: rollover._id || rollover.id,
    memberId: rollover.memberId,
    memberName: rollover.memberName,
    rejectedBy: adminId,
    reason
  })
}

/**
 * Log rollover cancellation
 */
export function logRolloverCancelled(rollover, memberId) {
  info('Rollover cancelled by member', {
    rolloverId: rollover._id || rollover.id,
    memberId,
    memberName: rollover.memberName
  })
}

/**
 * Log guarantor action
 */
export function logGuarantorAction(rolloverId, guarantorId, action) {
  info(`Guarantor ${action}`, {
    rolloverId,
    guarantorId,
    action
  })
}

/**
 * Log API request
 */
export function logApiRequest(method, path, duration, statusCode) {
  debug('API Request', {
    method,
    path,
    duration: `${duration}ms`,
    statusCode
  })
}

/**
 * Log error with stack trace
 */
export function logError(message, error, data = {}) {
  console.error(JSON.stringify({
    ...formatLog('error', message, data),
    error: error.message,
    stack: error.stack
  }))
}
