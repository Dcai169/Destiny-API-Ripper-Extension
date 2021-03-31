function evaluateReplace(expression, { replacement = undefined, callback = (res) => { return res; }, evalTarget = false } = {}) {
    return (!!expression === evalTarget ? replacement : callback(expression));
}

module.exports = evaluateReplace;