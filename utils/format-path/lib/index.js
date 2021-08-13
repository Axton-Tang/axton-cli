'use strict';

const path = require('path');

// 由于 window 和 mac 操作系统的路径分隔符不同，
// 需要将 window 中路径的反斜杠替换成斜杠，否则后续可能引发错误
function formatPath(p) {
  if (p && typeof p === 'string') {
		const sep = path.sep;
		if (sep === '/') {
			return p;
		} else {
			return p.replace(/\\/g, '/');
		}
	}
	return p;
}

module.exports = formatPath;
