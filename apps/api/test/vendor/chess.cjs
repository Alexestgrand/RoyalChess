"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WHITE = exports.SQUARES = exports.ROOK = exports.QUEEN = exports.PAWN = exports.KNIGHT = exports.KING = exports.FLAGS = exports.EMPTY = exports.Chess = exports.BLACK = exports.BISHOP = void 0;
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
/*
 * Copyright (c) 2022, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *----------------------------------------------------------------------------*/

var SYMBOLS = 'pnbrqkPNBRQK';
var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var TERMINATION_MARKERS = ['1-0', '0-1', '1/2-1/2', '*'];
var PAWN_OFFSETS = {
  b: [16, 32, 17, 15],
  w: [-16, -32, -17, -15]
};
var PIECE_OFFSETS = {
  n: [-18, -33, -31, -14, 18, 33, 31, 14],
  b: [-17, -15, 17, 15],
  r: [-16, 1, 16, -1],
  q: [-17, -16, -15, 1, 17, 16, 15, -1],
  k: [-17, -16, -15, 1, 17, 16, 15, -1]
};

// prettier-ignore
var ATTACKS = [20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20, 0, 0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0, 24, 24, 24, 24, 24, 24, 56, 0, 56, 24, 24, 24, 24, 24, 24, 0, 0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0, 20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20];

// prettier-ignore
var RAYS = [17, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 15, 0, 0, 17, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 17, 0, 0, 0, 0, 16, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 0, 16, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 16, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 16, 15, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, -15, -16, -17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -15, 0, -16, 0, -17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -15, 0, 0, -16, 0, 0, -17, 0, 0, 0, 0, 0, 0, 0, 0, -15, 0, 0, 0, -16, 0, 0, 0, -17, 0, 0, 0, 0, 0, 0, -15, 0, 0, 0, 0, -16, 0, 0, 0, 0, -17, 0, 0, 0, 0, -15, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, -17, 0, 0, -15, 0, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, 0, -17];
var SHIFTS = {
  p: 0,
  n: 1,
  b: 2,
  r: 3,
  q: 4,
  k: 5
};
var BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  BIG_PAWN: 4,
  EP_CAPTURE: 8,
  PROMOTION: 16,
  KSIDE_CASTLE: 32,
  QSIDE_CASTLE: 64
};
var RANK_1 = 7;
var RANK_2 = 6;
var RANK_3 = 5;
var RANK_4 = 4;
var RANK_5 = 3;
var RANK_6 = 2;
var RANK_7 = 1;
var RANK_8 = 0;

// prettier-ignore
var SQUARE_MAP = {
  a8: 0,
  b8: 1,
  c8: 2,
  d8: 3,
  e8: 4,
  f8: 5,
  g8: 6,
  h8: 7,
  a7: 16,
  b7: 17,
  c7: 18,
  d7: 19,
  e7: 20,
  f7: 21,
  g7: 22,
  h7: 23,
  a6: 32,
  b6: 33,
  c6: 34,
  d6: 35,
  e6: 36,
  f6: 37,
  g6: 38,
  h6: 39,
  a5: 48,
  b5: 49,
  c5: 50,
  d5: 51,
  e5: 52,
  f5: 53,
  g5: 54,
  h5: 55,
  a4: 64,
  b4: 65,
  c4: 66,
  d4: 67,
  e4: 68,
  f4: 69,
  g4: 70,
  h4: 71,
  a3: 80,
  b3: 81,
  c3: 82,
  d3: 83,
  e3: 84,
  f3: 85,
  g3: 86,
  h3: 87,
  a2: 96,
  b2: 97,
  c2: 98,
  d2: 99,
  e2: 100,
  f2: 101,
  g2: 102,
  h2: 103,
  a1: 112,
  b1: 113,
  c1: 114,
  d1: 115,
  e1: 116,
  f1: 117,
  g1: 118,
  h1: 119
};
var ROOKS = {
  w: [{
    square: SQUARE_MAP.a1,
    flag: BITS.QSIDE_CASTLE
  }, {
    square: SQUARE_MAP.h1,
    flag: BITS.KSIDE_CASTLE
  }],
  b: [{
    square: SQUARE_MAP.a8,
    flag: BITS.QSIDE_CASTLE
  }, {
    square: SQUARE_MAP.h8,
    flag: BITS.KSIDE_CASTLE
  }]
};
var PARSER_STRICT = 0;
var PARSER_SLOPPY = 1;

/* this function is used to uniquely identify ambiguous moves */
function get_disambiguator(move, moves) {
  var from = move.from;
  var to = move.to;
  var piece = move.piece;
  var ambiguities = 0;
  var same_rank = 0;
  var same_file = 0;
  for (var i = 0, len = moves.length; i < len; i++) {
    var ambig_from = moves[i].from;
    var ambig_to = moves[i].to;
    var ambig_piece = moves[i].piece;

    /* if a move of the same piece type ends on the same to square, we'll
     * need to add a disambiguator to the algebraic notation
     */
    if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
      ambiguities++;
      if (rank(from) === rank(ambig_from)) {
        same_rank++;
      }
      if (file(from) === file(ambig_from)) {
        same_file++;
      }
    }
  }
  if (ambiguities > 0) {
    /* if there exists a similar moving piece on the same rank and file as
     * the move in question, use the square as the disambiguator
     */
    if (same_rank > 0 && same_file > 0) {
      return algebraic(from);
    } else if (same_file > 0) {
      /* if the moving piece rests on the same file, use the rank symbol as the
       * disambiguator
       */
      return algebraic(from).charAt(1);
    } else {
      /* else use the file symbol */
      return algebraic(from).charAt(0);
    }
  }
  return '';
}
function infer_piece_type(san) {
  var piece_type = san.charAt(0);
  if (piece_type >= 'a' && piece_type <= 'h') {
    var matches = san.match(/[a-h]\d.*[a-h]\d/);
    if (matches) {
      return undefined;
    }
    return PAWN;
  }
  piece_type = piece_type.toLowerCase();
  if (piece_type === 'o') {
    return KING;
  }
  return piece_type;
}

// parses all of the decorators out of a SAN string
function stripped_san(move) {
  return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
}

/*****************************************************************************
 * UTILITY FUNCTIONS
 ****************************************************************************/
function rank(i) {
  return i >> 4;
}
function file(i) {
  return i & 15;
}
function algebraic(i) {
  var f = file(i),
    r = rank(i);
  return 'abcdefgh'.substring(f, f + 1) + '87654321'.substring(r, r + 1);
}
function swap_color(c) {
  return c === WHITE ? BLACK : WHITE;
}
function is_digit(c) {
  return '0123456789'.indexOf(c) !== -1;
}
function clone(obj) {
  var dupe = obj instanceof Array ? [] : {};
  for (var property in obj) {
    if (_typeof(property) === 'object') {
      dupe[property] = clone(obj[property]);
    } else {
      dupe[property] = obj[property];
    }
  }
  return dupe;
}
function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

/***************************************************************************
 * PUBLIC CONSTANTS
 **************************************************************************/

var BLACK = exports.BLACK = 'b';
var WHITE = exports.WHITE = 'w';
var EMPTY = exports.EMPTY = -1;
var PAWN = exports.PAWN = 'p';
var KNIGHT = exports.KNIGHT = 'n';
var BISHOP = exports.BISHOP = 'b';
var ROOK = exports.ROOK = 'r';
var QUEEN = exports.QUEEN = 'q';
var KING = exports.KING = 'k';
var SQUARES = exports.SQUARES = function () {
  /* from the ECMA-262 spec (section 12.6.4):
   * "The mechanics of enumerating the properties ... is
   * implementation dependent"
   * so: for (var sq in SQUARES) { keys.push(sq); } might not be
   * ordered correctly
   */
  var keys = [];
  for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
    if (i & 0x88) {
      i += 7;
      continue;
    }
    keys.push(algebraic(i));
  }
  return keys;
}();
var FLAGS = exports.FLAGS = {
  NORMAL: 'n',
  CAPTURE: 'c',
  BIG_PAWN: 'b',
  EP_CAPTURE: 'e',
  PROMOTION: 'p',
  KSIDE_CASTLE: 'k',
  QSIDE_CASTLE: 'q'
};
var Chess = exports.Chess = function Chess(fen) {
  var _board = new Array(128);
  var kings = {
    w: EMPTY,
    b: EMPTY
  };
  var _turn = WHITE;
  var castling = {
    w: 0,
    b: 0
  };
  var ep_square = EMPTY;
  var half_moves = 0;
  var move_number = 1;
  var _history = [];
  var header = {};
  var comments = {};

  /* if the user passes in a fen string, load it, else default to
   * starting position
   */
  if (typeof fen === 'undefined') {
    _load(DEFAULT_POSITION);
  } else {
    _load(fen);
  }
  function _clear(keep_headers) {
    if (typeof keep_headers === 'undefined') {
      keep_headers = false;
    }
    _board = new Array(128);
    kings = {
      w: EMPTY,
      b: EMPTY
    };
    _turn = WHITE;
    castling = {
      w: 0,
      b: 0
    };
    ep_square = EMPTY;
    half_moves = 0;
    move_number = 1;
    _history = [];
    if (!keep_headers) header = {};
    comments = {};
    update_setup(generate_fen());
  }
  function prune_comments() {
    var reversed_history = [];
    var current_comments = {};
    var copy_comment = function copy_comment(fen) {
      if (fen in comments) {
        current_comments[fen] = comments[fen];
      }
    };
    while (_history.length > 0) {
      reversed_history.push(undo_move());
    }
    copy_comment(generate_fen());
    while (reversed_history.length > 0) {
      make_move(reversed_history.pop());
      copy_comment(generate_fen());
    }
    comments = current_comments;
  }
  function _reset() {
    _load(DEFAULT_POSITION);
  }
  function _load(fen, keep_headers) {
    if (typeof keep_headers === 'undefined') {
      keep_headers = false;
    }
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;
    if (!_validate_fen(fen).valid) {
      return false;
    }
    _clear(keep_headers);
    for (var i = 0; i < position.length; i++) {
      var piece = position.charAt(i);
      if (piece === '/') {
        square += 8;
      } else if (is_digit(piece)) {
        square += parseInt(piece, 10);
      } else {
        var color = piece < 'a' ? WHITE : BLACK;
        _put({
          type: piece.toLowerCase(),
          color: color
        }, algebraic(square));
        square++;
      }
    }
    _turn = tokens[1];
    if (tokens[2].indexOf('K') > -1) {
      castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('Q') > -1) {
      castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf('k') > -1) {
      castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE;
    }
    ep_square = tokens[3] === '-' ? EMPTY : SQUARE_MAP[tokens[3]];
    half_moves = parseInt(tokens[4], 10);
    move_number = parseInt(tokens[5], 10);
    update_setup(generate_fen());
    return true;
  }

  /* TODO: this function is pretty much crap - it validates structure but
   * completely ignores content (e.g. doesn't verify that each side has a king)
   * ... we should rewrite this, and ditch the silly error_number field while
   * we're at it
   */
  function _validate_fen(fen) {
    var errors = {
      0: 'No errors.',
      1: 'FEN string must contain six space-delimited fields.',
      2: '6th field (move number) must be a positive integer.',
      3: '5th field (half move counter) must be a non-negative integer.',
      4: '4th field (en-passant square) is invalid.',
      5: '3rd field (castling availability) is invalid.',
      6: '2nd field (side to move) is invalid.',
      7: "1st field (piece positions) does not contain 8 '/'-delimited rows.",
      8: '1st field (piece positions) is invalid [consecutive numbers].',
      9: '1st field (piece positions) is invalid [invalid piece].',
      10: '1st field (piece positions) is invalid [row too large].',
      11: 'Illegal en-passant square'
    };

    /* 1st criterion: 6 space-seperated fields? */
    var tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {
        valid: false,
        error_number: 1,
        error: errors[1]
      };
    }

    /* 2nd criterion: move number field is a integer value > 0? */
    if (isNaN(parseInt(tokens[5])) || parseInt(tokens[5], 10) <= 0) {
      return {
        valid: false,
        error_number: 2,
        error: errors[2]
      };
    }

    /* 3rd criterion: half move counter is an integer >= 0? */
    if (isNaN(parseInt(tokens[4])) || parseInt(tokens[4], 10) < 0) {
      return {
        valid: false,
        error_number: 3,
        error: errors[3]
      };
    }

    /* 4th criterion: 4th field is a valid e.p.-string? */
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return {
        valid: false,
        error_number: 4,
        error: errors[4]
      };
    }

    /* 5th criterion: 3th field is a valid castle-string? */
    if (!/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])) {
      return {
        valid: false,
        error_number: 5,
        error: errors[5]
      };
    }

    /* 6th criterion: 2nd field is "w" (white) or "b" (black)? */
    if (!/^(w|b)$/.test(tokens[1])) {
      return {
        valid: false,
        error_number: 6,
        error: errors[6]
      };
    }

    /* 7th criterion: 1st field contains 8 rows? */
    var rows = tokens[0].split('/');
    if (rows.length !== 8) {
      return {
        valid: false,
        error_number: 7,
        error: errors[7]
      };
    }

    /* 8th criterion: every row is valid? */
    for (var i = 0; i < rows.length; i++) {
      /* check for right sum of fields AND not two numbers in succession */
      var sum_fields = 0;
      var previous_was_number = false;
      for (var k = 0; k < rows[i].length; k++) {
        if (!isNaN(rows[i][k])) {
          if (previous_was_number) {
            return {
              valid: false,
              error_number: 8,
              error: errors[8]
            };
          }
          sum_fields += parseInt(rows[i][k], 10);
          previous_was_number = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {
              valid: false,
              error_number: 9,
              error: errors[9]
            };
          }
          sum_fields += 1;
          previous_was_number = false;
        }
      }
      if (sum_fields !== 8) {
        return {
          valid: false,
          error_number: 10,
          error: errors[10]
        };
      }
    }
    if (tokens[3][1] == '3' && tokens[1] == 'w' || tokens[3][1] == '6' && tokens[1] == 'b') {
      return {
        valid: false,
        error_number: 11,
        error: errors[11]
      };
    }

    /* everything's okay! */
    return {
      valid: true,
      error_number: 0,
      error: errors[0]
    };
  }
  function generate_fen() {
    var empty = 0;
    var fen = '';
    for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
      if (_board[i] == null) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        var color = _board[i].color;
        var piece = _board[i].type;
        fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
      }
      if (i + 1 & 0x88) {
        if (empty > 0) {
          fen += empty;
        }
        if (i !== SQUARE_MAP.h1) {
          fen += '/';
        }
        empty = 0;
        i += 8;
      }
    }
    var cflags = '';
    if (castling[WHITE] & BITS.KSIDE_CASTLE) {
      cflags += 'K';
    }
    if (castling[WHITE] & BITS.QSIDE_CASTLE) {
      cflags += 'Q';
    }
    if (castling[BLACK] & BITS.KSIDE_CASTLE) {
      cflags += 'k';
    }
    if (castling[BLACK] & BITS.QSIDE_CASTLE) {
      cflags += 'q';
    }

    /* do we have an empty castling flag? */
    cflags = cflags || '-';
    var epflags = ep_square === EMPTY ? '-' : algebraic(ep_square);
    return [fen, _turn, cflags, epflags, half_moves, move_number].join(' ');
  }
  function set_header(args) {
    for (var i = 0; i < args.length; i += 2) {
      if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') {
        header[args[i]] = args[i + 1];
      }
    }
    return header;
  }

  /* called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object.  if the FEN is
   * equal to the default position, the SetUp and FEN are deleted
   * the setup is only updated if history.length is zero, ie moves haven't been
   * made.
   */
  function update_setup(fen) {
    if (_history.length > 0) return;
    if (fen !== DEFAULT_POSITION) {
      header['SetUp'] = '1';
      header['FEN'] = fen;
    } else {
      delete header['SetUp'];
      delete header['FEN'];
    }
  }
  function _get(square) {
    var piece = _board[SQUARE_MAP[square]];
    return piece ? {
      type: piece.type,
      color: piece.color
    } : null;
  }
  function _put(piece, square) {
    /* check for valid piece object */
    if (!('type' in piece && 'color' in piece)) {
      return false;
    }

    /* check for piece */
    if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
      return false;
    }

    /* check for valid square */
    if (!(square in SQUARE_MAP)) {
      return false;
    }
    var sq = SQUARE_MAP[square];

    /* don't let the user place more than one king */
    if (piece.type == KING && !(kings[piece.color] == EMPTY || kings[piece.color] == sq)) {
      return false;
    }
    _board[sq] = {
      type: piece.type,
      color: piece.color
    };
    if (piece.type === KING) {
      kings[piece.color] = sq;
    }
    update_setup(generate_fen());
    return true;
  }
  function _remove(square) {
    var piece = _get(square);
    _board[SQUARE_MAP[square]] = null;
    if (piece && piece.type === KING) {
      kings[piece.color] = EMPTY;
    }
    update_setup(generate_fen());
    return piece;
  }
  function build_move(board, from, to, flags, promotion) {
    var move = {
      color: _turn,
      from: from,
      to: to,
      flags: flags,
      piece: board[from].type
    };
    if (promotion) {
      move.flags |= BITS.PROMOTION;
      move.promotion = promotion;
    }
    if (board[to]) {
      move.captured = board[to].type;
    } else if (flags & BITS.EP_CAPTURE) {
      move.captured = PAWN;
    }
    return move;
  }
  function generate_moves(options) {
    function add_move(board, moves, from, to, flags) {
      /* if pawn promotion */
      if (board[from].type === PAWN && (rank(to) === RANK_8 || rank(to) === RANK_1)) {
        var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
        for (var i = 0, len = pieces.length; i < len; i++) {
          moves.push(build_move(board, from, to, flags, pieces[i]));
        }
      } else {
        moves.push(build_move(board, from, to, flags));
      }
    }
    var moves = [];
    var us = _turn;
    var them = swap_color(us);
    var second_rank = {
      b: RANK_7,
      w: RANK_2
    };
    var first_sq = SQUARE_MAP.a8;
    var last_sq = SQUARE_MAP.h1;
    var single_square = false;

    /* do we want legal moves? */
    var legal = typeof options !== 'undefined' && 'legal' in options ? options.legal : true;
    var piece_type = typeof options !== 'undefined' && 'piece' in options && typeof options.piece === 'string' ? options.piece.toLowerCase() : true;

    /* are we generating moves for a single square? */
    if (typeof options !== 'undefined' && 'square' in options) {
      if (options.square in SQUARE_MAP) {
        first_sq = last_sq = SQUARE_MAP[options.square];
        single_square = true;
      } else {
        /* invalid square */
        return [];
      }
    }
    for (var i = first_sq; i <= last_sq; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) {
        i += 7;
        continue;
      }
      var piece = _board[i];
      if (piece == null || piece.color !== us) {
        continue;
      }
      if (piece.type === PAWN && (piece_type === true || piece_type === PAWN)) {
        /* single square, non-capturing */
        var square = i + PAWN_OFFSETS[us][0];
        if (_board[square] == null) {
          add_move(_board, moves, i, square, BITS.NORMAL);

          /* double square */
          var square = i + PAWN_OFFSETS[us][1];
          if (second_rank[us] === rank(i) && _board[square] == null) {
            add_move(_board, moves, i, square, BITS.BIG_PAWN);
          }
        }

        /* pawn captures */
        for (j = 2; j < 4; j++) {
          var square = i + PAWN_OFFSETS[us][j];
          if (square & 0x88) continue;
          if (_board[square] != null && _board[square].color === them) {
            add_move(_board, moves, i, square, BITS.CAPTURE);
          } else if (square === ep_square) {
            add_move(_board, moves, i, ep_square, BITS.EP_CAPTURE);
          }
        }
      } else if (piece_type === true || piece_type === piece.type) {
        for (var j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
          var offset = PIECE_OFFSETS[piece.type][j];
          var square = i;
          while (true) {
            square += offset;
            if (square & 0x88) break;
            if (_board[square] == null) {
              add_move(_board, moves, i, square, BITS.NORMAL);
            } else {
              if (_board[square].color === us) break;
              add_move(_board, moves, i, square, BITS.CAPTURE);
              break;
            }

            /* break, if knight or king */
            if (piece.type === 'n' || piece.type === 'k') break;
          }
        }
      }
    }

    /* check for castling if: a) we're generating all moves, or b) we're doing
     * single square move generation on the king's square
     */
    if (piece_type === true || piece_type === KING) {
      if (!single_square || last_sq === kings[us]) {
        /* king-side castling */
        if (castling[us] & BITS.KSIDE_CASTLE) {
          var castling_from = kings[us];
          var castling_to = castling_from + 2;
          if (_board[castling_from + 1] == null && _board[castling_to] == null && !attacked(them, kings[us]) && !attacked(them, castling_from + 1) && !attacked(them, castling_to)) {
            add_move(_board, moves, kings[us], castling_to, BITS.KSIDE_CASTLE);
          }
        }

        /* queen-side castling */
        if (castling[us] & BITS.QSIDE_CASTLE) {
          var castling_from = kings[us];
          var castling_to = castling_from - 2;
          if (_board[castling_from - 1] == null && _board[castling_from - 2] == null && _board[castling_from - 3] == null && !attacked(them, kings[us]) && !attacked(them, castling_from - 1) && !attacked(them, castling_to)) {
            add_move(_board, moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
          }
        }
      }
    }

    /* return all pseudo-legal moves (this includes moves that allow the king
     * to be captured)
     */
    if (!legal) {
      return moves;
    }

    /* filter out illegal moves */
    var legal_moves = [];
    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(us)) {
        legal_moves.push(moves[i]);
      }
      undo_move();
    }
    return legal_moves;
  }

  /* convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} sloppy Use the sloppy SAN generator to work around over
   * disambiguation bugs in Fritz and Chessbase.  See below:
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  function move_to_san(move, moves) {
    var output = '';
    if (move.flags & BITS.KSIDE_CASTLE) {
      output = 'O-O';
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = 'O-O-O';
    } else {
      if (move.piece !== PAWN) {
        var disambiguator = get_disambiguator(move, moves);
        output += move.piece.toUpperCase() + disambiguator;
      }
      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0];
        }
        output += 'x';
      }
      output += algebraic(move.to);
      if (move.flags & BITS.PROMOTION) {
        output += '=' + move.promotion.toUpperCase();
      }
    }
    make_move(move);
    if (_in_check()) {
      if (_in_checkmate()) {
        output += '#';
      } else {
        output += '+';
      }
    }
    undo_move();
    return output;
  }
  function attacked(color, square) {
    for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) {
        i += 7;
        continue;
      }

      /* if empty square or wrong color */
      if (_board[i] == null || _board[i].color !== color) continue;
      var piece = _board[i];
      var difference = i - square;
      var index = difference + 119;
      if (ATTACKS[index] & 1 << SHIFTS[piece.type]) {
        if (piece.type === PAWN) {
          if (difference > 0) {
            if (piece.color === WHITE) return true;
          } else {
            if (piece.color === BLACK) return true;
          }
          continue;
        }

        /* if the piece is a knight or a king */
        if (piece.type === 'n' || piece.type === 'k') return true;
        var offset = RAYS[index];
        var j = i + offset;
        var blocked = false;
        while (j !== square) {
          if (_board[j] != null) {
            blocked = true;
            break;
          }
          j += offset;
        }
        if (!blocked) return true;
      }
    }
    return false;
  }
  function king_attacked(color) {
    return attacked(swap_color(color), kings[color]);
  }
  function _in_check() {
    return king_attacked(_turn);
  }
  function _in_checkmate() {
    return _in_check() && generate_moves().length === 0;
  }
  function _in_stalemate() {
    return !_in_check() && generate_moves().length === 0;
  }
  function _insufficient_material() {
    var pieces = {};
    var bishops = [];
    var num_pieces = 0;
    var sq_color = 0;
    for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
      sq_color = (sq_color + 1) % 2;
      if (i & 0x88) {
        i += 7;
        continue;
      }
      var piece = _board[i];
      if (piece) {
        pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(sq_color);
        }
        num_pieces++;
      }
    }

    /* k vs. k */
    if (num_pieces === 2) {
      return true;
    } else if (/* k vs. kn .... or .... k vs. kb */
    num_pieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) {
      return true;
    } else if (num_pieces === pieces[BISHOP] + 2) {
      /* kb vs. kb where any number of bishops are all on the same color */
      var sum = 0;
      var len = bishops.length;
      for (var i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) {
        return true;
      }
    }
    return false;
  }
  function _in_threefold_repetition() {
    /* TODO: while this function is fine for casual use, a better
     * implementation would use a Zobrist key (instead of FEN). the
     * Zobrist key would be maintained in the make_move/undo_move functions,
     * avoiding the costly that we do below.
     */
    var moves = [];
    var positions = {};
    var repetition = false;
    while (true) {
      var move = undo_move();
      if (!move) break;
      moves.push(move);
    }
    while (true) {
      /* remove the last two fields in the FEN string, they're not needed
       * when checking for draw by rep */
      var fen = generate_fen().split(' ').slice(0, 4).join(' ');

      /* has the position occurred three or move times */
      positions[fen] = fen in positions ? positions[fen] + 1 : 1;
      if (positions[fen] >= 3) {
        repetition = true;
      }
      if (!moves.length) {
        break;
      }
      make_move(moves.pop());
    }
    return repetition;
  }
  function push(move) {
    _history.push({
      move: move,
      kings: {
        b: kings.b,
        w: kings.w
      },
      turn: _turn,
      castling: {
        b: castling.b,
        w: castling.w
      },
      ep_square: ep_square,
      half_moves: half_moves,
      move_number: move_number
    });
  }
  function make_move(move) {
    var us = _turn;
    var them = swap_color(us);
    push(move);
    _board[move.to] = _board[move.from];
    _board[move.from] = null;

    /* if ep capture, remove the captured pawn */
    if (move.flags & BITS.EP_CAPTURE) {
      if (_turn === BLACK) {
        _board[move.to - 16] = null;
      } else {
        _board[move.to + 16] = null;
      }
    }

    /* if pawn promotion, replace with new piece */
    if (move.flags & BITS.PROMOTION) {
      _board[move.to] = {
        type: move.promotion,
        color: us
      };
    }

    /* if we moved the king */
    if (_board[move.to].type === KING) {
      kings[_board[move.to].color] = move.to;

      /* if we castled, move the rook next to the king */
      if (move.flags & BITS.KSIDE_CASTLE) {
        var castling_to = move.to - 1;
        var castling_from = move.to + 1;
        _board[castling_to] = _board[castling_from];
        _board[castling_from] = null;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        var castling_to = move.to + 1;
        var castling_from = move.to - 2;
        _board[castling_to] = _board[castling_from];
        _board[castling_from] = null;
      }

      /* turn off castling */
      castling[us] = '';
    }

    /* turn off castling if we move a rook */
    if (castling[us]) {
      for (var i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move.from === ROOKS[us][i].square && castling[us] & ROOKS[us][i].flag) {
          castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }

    /* turn off castling if we capture a rook */
    if (castling[them]) {
      for (var i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move.to === ROOKS[them][i].square && castling[them] & ROOKS[them][i].flag) {
          castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }

    /* if big pawn move, update the en passant square */
    if (move.flags & BITS.BIG_PAWN) {
      if (_turn === 'b') {
        ep_square = move.to - 16;
      } else {
        ep_square = move.to + 16;
      }
    } else {
      ep_square = EMPTY;
    }

    /* reset the 50 move counter if a pawn is moved or a piece is captured */
    if (move.piece === PAWN) {
      half_moves = 0;
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      half_moves = 0;
    } else {
      half_moves++;
    }
    if (_turn === BLACK) {
      move_number++;
    }
    _turn = swap_color(_turn);
  }
  function undo_move() {
    var old = _history.pop();
    if (old == null) {
      return null;
    }
    var move = old.move;
    kings = old.kings;
    _turn = old.turn;
    castling = old.castling;
    ep_square = old.ep_square;
    half_moves = old.half_moves;
    move_number = old.move_number;
    var us = _turn;
    var them = swap_color(_turn);
    _board[move.from] = _board[move.to];
    _board[move.from].type = move.piece; // to undo any promotions
    _board[move.to] = null;
    if (move.flags & BITS.CAPTURE) {
      _board[move.to] = {
        type: move.captured,
        color: them
      };
    } else if (move.flags & BITS.EP_CAPTURE) {
      var index;
      if (us === BLACK) {
        index = move.to - 16;
      } else {
        index = move.to + 16;
      }
      _board[index] = {
        type: PAWN,
        color: them
      };
    }
    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      var castling_to, castling_from;
      if (move.flags & BITS.KSIDE_CASTLE) {
        castling_to = move.to + 1;
        castling_from = move.to - 1;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        castling_to = move.to - 2;
        castling_from = move.to + 1;
      }
      _board[castling_to] = _board[castling_from];
      _board[castling_from] = null;
    }
    return move;
  }

  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  function move_from_san(move, sloppy) {
    // strip off any move decorations: e.g Nf3+?! becomes Nf3
    var clean_move = stripped_san(move);

    // the move parsers is a 2-step state
    for (var parser = 0; parser < 2; parser++) {
      if (parser == PARSER_SLOPPY) {
        // only run the sloppy parse if explicitly requested
        if (!sloppy) {
          return null;
        }

        // The sloppy parser allows the user to parse non-standard chess
        // notations. This parser is opt-in (by specifying the
        // '{ sloppy: true }' setting) and is only run after the Standard
        // Algebraic Notation (SAN) parser has failed.
        //
        // When running the sloppy parser, we'll run a regex to grab the piece,
        // the to/from square, and an optional promotion piece. This regex will
        // parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
        // f7f8q, b1c3

        // NOTE: Some positions and moves may be ambiguous when using the
        // sloppy parser. For example, in this position:
        // 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1, the move b1c3 may be interpreted
        // as Nc3 or B1c3 (a disambiguated bishop move). In these cases, the
        // sloppy parser will default to the most most basic interpretation
        // (which is b1c3 parsing to Nc3).

        // FIXME: these var's are hoisted into function scope, this will need
        // to change when switching to const/let

        var overly_disambiguated = false;
        var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
          var piece = matches[1];
          var from = matches[2];
          var to = matches[3];
          var promotion = matches[4];
          if (from.length == 1) {
            overly_disambiguated = true;
          }
        } else {
          // The [a-h]?[1-8]? portion of the regex below handles moves that may
          // be overly disambiguated (e.g. Nge7 is unnecessary and non-standard
          // when there is one legal knight move to e7). In this case, the value
          // of 'from' variable will be a rank or file, not a square.
          var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
          if (matches) {
            var piece = matches[1];
            var from = matches[2];
            var to = matches[3];
            var promotion = matches[4];
            if (from.length == 1) {
              var overly_disambiguated = true;
            }
          }
        }
      }
      var piece_type = infer_piece_type(clean_move);
      var moves = generate_moves({
        legal: true,
        piece: piece ? piece : piece_type
      });
      for (var i = 0, len = moves.length; i < len; i++) {
        switch (parser) {
          case PARSER_STRICT:
            {
              if (clean_move === stripped_san(move_to_san(moves[i], moves))) {
                return moves[i];
              }
              break;
            }
          case PARSER_SLOPPY:
            {
              if (matches) {
                // hand-compare move properties with the results from our sloppy
                // regex
                if ((!piece || piece.toLowerCase() == moves[i].piece) && SQUARE_MAP[from] == moves[i].from && SQUARE_MAP[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                  return moves[i];
                } else if (overly_disambiguated) {
                  // SPECIAL CASE: we parsed a move string that may have an
                  // unneeded rank/file disambiguator (e.g. Nge7).  The 'from'
                  // variable will
                  var square = algebraic(moves[i].from);
                  if ((!piece || piece.toLowerCase() == moves[i].piece) && SQUARE_MAP[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                    return moves[i];
                  }
                }
              }
            }
        }
      }
    }
    return null;
  }

  /* pretty = external move object */
  function make_pretty(ugly_move) {
    var move = clone(ugly_move);
    move.san = move_to_san(move, generate_moves({
      legal: true
    }));
    move.to = algebraic(move.to);
    move.from = algebraic(move.from);
    var flags = '';
    for (var flag in BITS) {
      if (BITS[flag] & move.flags) {
        flags += FLAGS[flag];
      }
    }
    move.flags = flags;
    return move;
  }

  /*****************************************************************************
   * DEBUGGING UTILITIES
   ****************************************************************************/
  function _perft(depth) {
    var moves = generate_moves({
      legal: false
    });
    var nodes = 0;
    var color = _turn;
    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(color)) {
        if (depth - 1 > 0) {
          var child_nodes = _perft(depth - 1);
          nodes += child_nodes;
        } else {
          nodes++;
        }
      }
      undo_move();
    }
    return nodes;
  }
  return {
    /***************************************************************************
     * PUBLIC API
     **************************************************************************/
    load: function load(fen) {
      return _load(fen);
    },
    reset: function reset() {
      return _reset();
    },
    moves: function moves(options) {
      /* The internal representation of a chess move is in 0x88 format, and
       * not meant to be human-readable.  The code below converts the 0x88
       * square coordinates to algebraic coordinates.  It also prunes an
       * unnecessary move keys resulting from a verbose call.
       */

      var ugly_moves = generate_moves(options);
      var moves = [];
      for (var i = 0, len = ugly_moves.length; i < len; i++) {
        /* does the user want a full move object (most likely not), or just
         * SAN
         */
        if (typeof options !== 'undefined' && 'verbose' in options && options.verbose) {
          moves.push(make_pretty(ugly_moves[i]));
        } else {
          moves.push(move_to_san(ugly_moves[i], generate_moves({
            legal: true
          })));
        }
      }
      return moves;
    },
    in_check: function in_check() {
      return _in_check();
    },
    in_checkmate: function in_checkmate() {
      return _in_checkmate();
    },
    in_stalemate: function in_stalemate() {
      return _in_stalemate();
    },
    in_draw: function in_draw() {
      return half_moves >= 100 || _in_stalemate() || _insufficient_material() || _in_threefold_repetition();
    },
    insufficient_material: function insufficient_material() {
      return _insufficient_material();
    },
    in_threefold_repetition: function in_threefold_repetition() {
      return _in_threefold_repetition();
    },
    game_over: function game_over() {
      return half_moves >= 100 || _in_checkmate() || _in_stalemate() || _insufficient_material() || _in_threefold_repetition();
    },
    validate_fen: function validate_fen(fen) {
      return _validate_fen(fen);
    },
    fen: function fen() {
      return generate_fen();
    },
    board: function board() {
      var output = [],
        row = [];
      for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
        if (_board[i] == null) {
          row.push(null);
        } else {
          row.push({
            square: algebraic(i),
            type: _board[i].type,
            color: _board[i].color
          });
        }
        if (i + 1 & 0x88) {
          output.push(row);
          row = [];
          i += 8;
        }
      }
      return output;
    },
    pgn: function pgn(options) {
      /* using the specification from http://www.chessclub.com/help/PGN-spec
       * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
       */
      var newline = _typeof(options) === 'object' && typeof options.newline_char === 'string' ? options.newline_char : '\n';
      var max_width = _typeof(options) === 'object' && typeof options.max_width === 'number' ? options.max_width : 0;
      var result = [];
      var header_exists = false;

      /* add the PGN header information */
      for (var i in header) {
        /* TODO: order of enumerated properties in header object is not
         * guaranteed, see ECMA-262 spec (section 12.6.4)
         */
        result.push('[' + i + ' "' + header[i] + '"]' + newline);
        header_exists = true;
      }
      if (header_exists && _history.length) {
        result.push(newline);
      }
      var append_comment = function append_comment(move_string) {
        var comment = comments[generate_fen()];
        if (typeof comment !== 'undefined') {
          var delimiter = move_string.length > 0 ? ' ' : '';
          move_string = "".concat(move_string).concat(delimiter, "{").concat(comment, "}");
        }
        return move_string;
      };

      /* pop all of history onto reversed_history */
      var reversed_history = [];
      while (_history.length > 0) {
        reversed_history.push(undo_move());
      }
      var moves = [];
      var move_string = '';

      /* special case of a commented starting position with no moves */
      if (reversed_history.length === 0) {
        moves.push(append_comment(''));
      }

      /* build the list of moves.  a move_string looks like: "3. e3 e6" */
      while (reversed_history.length > 0) {
        move_string = append_comment(move_string);
        var move = reversed_history.pop();

        /* if the position started with black to move, start PGN with #. ... */
        if (!_history.length && move.color === 'b') {
          var prefix = "".concat(move_number, ". ...");
          /* is there a comment preceding the first move? */
          move_string = move_string ? "".concat(move_string, " ").concat(prefix) : prefix;
        } else if (move.color === 'w') {
          /* store the previous generated move_string if we have one */
          if (move_string.length) {
            moves.push(move_string);
          }
          move_string = move_number + '.';
        }
        move_string = move_string + ' ' + move_to_san(move, generate_moves({
          legal: true
        }));
        make_move(move);
      }

      /* are there any other leftover moves? */
      if (move_string.length) {
        moves.push(append_comment(move_string));
      }

      /* is there a result? */
      if (typeof header.Result !== 'undefined') {
        moves.push(header.Result);
      }

      /* history should be back to what it was before we started generating PGN,
       * so join together moves
       */
      if (max_width === 0) {
        return result.join('') + moves.join(' ');
      }
      var strip = function strip() {
        if (result.length > 0 && result[result.length - 1] === ' ') {
          result.pop();
          return true;
        }
        return false;
      };

      /* NB: this does not preserve comment whitespace. */
      var wrap_comment = function wrap_comment(width, move) {
        var _iterator = _createForOfIteratorHelper(move.split(' ')),
          _step;
        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var token = _step.value;
            if (!token) {
              continue;
            }
            if (width + token.length > max_width) {
              while (strip()) {
                width--;
              }
              result.push(newline);
              width = 0;
            }
            result.push(token);
            width += token.length;
            result.push(' ');
            width++;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
        if (strip()) {
          width--;
        }
        return width;
      };

      /* wrap the PGN output at max_width */
      var current_width = 0;
      for (var i = 0; i < moves.length; i++) {
        if (current_width + moves[i].length > max_width) {
          if (moves[i].includes('{')) {
            current_width = wrap_comment(current_width, moves[i]);
            continue;
          }
        }
        /* if the current move will push past max_width */
        if (current_width + moves[i].length > max_width && i !== 0) {
          /* don't end the line with whitespace */
          if (result[result.length - 1] === ' ') {
            result.pop();
          }
          result.push(newline);
          current_width = 0;
        } else if (i !== 0) {
          result.push(' ');
          current_width++;
        }
        result.push(moves[i]);
        current_width += moves[i].length;
      }
      return result.join('');
    },
    load_pgn: function load_pgn(pgn, options) {
      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = typeof options !== 'undefined' && 'sloppy' in options ? options.sloppy : false;
      function mask(str) {
        return str.replace(/\\/g, '\\');
      }
      function parse_pgn_header(header, options) {
        var newline_char = _typeof(options) === 'object' && typeof options.newline_char === 'string' ? options.newline_char : '\r?\n';
        var header_obj = {};
        var headers = header.split(new RegExp(mask(newline_char)));
        var key = '';
        var value = '';
        for (var i = 0; i < headers.length; i++) {
          var regex = /^\s*\[([A-Za-z]+)\s*"(.*)"\s*\]\s*$/;
          key = headers[i].replace(regex, '$1');
          value = headers[i].replace(regex, '$2');
          if (trim(key).length > 0) {
            header_obj[key] = value;
          }
        }
        return header_obj;
      }

      // strip whitespace from head/tail of PGN block
      pgn = pgn.trim();
      var newline_char = _typeof(options) === 'object' && typeof options.newline_char === 'string' ? options.newline_char : '\r?\n';

      // RegExp to split header. Takes advantage of the fact that header and movetext
      // will always have a blank line between them (ie, two newline_char's).
      // With default newline_char, will equal: /^(\[((?:\r?\n)|.)*\])(?:\s*\r?\n){2}/
      var header_regex = new RegExp('^(\\[((?:' + mask(newline_char) + ')|.)*\\])' + '(?:\\s*' + mask(newline_char) + '){2}');

      // If no header given, begin with moves.
      var header_string = header_regex.test(pgn) ? header_regex.exec(pgn)[1] : '';

      // Put the board in the starting position
      _reset();

      /* parse PGN header */
      var headers = parse_pgn_header(header_string, options);
      var fen = '';
      for (var key in headers) {
        // check to see user is including fen (possibly with wrong tag case)
        if (key.toLowerCase() === 'fen') {
          fen = headers[key];
        }
        set_header([key, headers[key]]);
      }

      /* sloppy parser should attempt to load a fen tag, even if it's
       * the wrong case and doesn't include a corresponding [SetUp "1"] tag */
      if (sloppy) {
        if (fen) {
          if (!_load(fen, true)) {
            return false;
          }
        }
      } else {
        /* strict parser - load the starting position indicated by [Setup '1']
         * and [FEN position] */
        if (headers['SetUp'] === '1') {
          if (!('FEN' in headers && _load(headers['FEN'], true))) {
            // second argument to load: don't clear the headers
            return false;
          }
        }
      }

      /* NB: the regexes below that delete move numbers, recursive
       * annotations, and numeric annotation glyphs may also match
       * text in comments. To prevent this, we transform comments
       * by hex-encoding them in place and decoding them again after
       * the other tokens have been deleted.
       *
       * While the spec states that PGN files should be ASCII encoded,
       * we use {en,de}codeURIComponent here to support arbitrary UTF8
       * as a convenience for modern users */

      var to_hex = function to_hex(string) {
        return Array.from(string).map(function (c) {
          /* encodeURI doesn't transform most ASCII characters,
           * so we handle these ourselves */
          return c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : encodeURIComponent(c).replace(/\%/g, '').toLowerCase();
        }).join('');
      };
      var from_hex = function from_hex(string) {
        return string.length == 0 ? '' : decodeURIComponent('%' + string.match(/.{1,2}/g).join('%'));
      };
      var encode_comment = function encode_comment(string) {
        string = string.replace(new RegExp(mask(newline_char), 'g'), ' ');
        return "{".concat(to_hex(string.slice(1, string.length - 1)), "}");
      };
      var decode_comment = function decode_comment(string) {
        if (string.startsWith('{') && string.endsWith('}')) {
          return from_hex(string.slice(1, string.length - 1));
        }
      };

      /* delete header to get the moves */
      var ms = pgn.replace(header_string, '').replace(/* encode comments so they don't get deleted below */
      new RegExp("({[^}]*})+?|;([^".concat(mask(newline_char), "]*)"), 'g'), function (match, bracket, semicolon) {
        return bracket !== undefined ? encode_comment(bracket) : ' ' + encode_comment("{".concat(semicolon.slice(1), "}"));
      }).replace(new RegExp(mask(newline_char), 'g'), ' ');

      /* delete recursive annotation variations */
      var rav_regex = /(\([^\(\)]+\))+?/g;
      while (rav_regex.test(ms)) {
        ms = ms.replace(rav_regex, '');
      }

      /* delete move numbers */
      ms = ms.replace(/\d+\.(\.\.)?/g, '');

      /* delete ... indicating black to move */
      ms = ms.replace(/\.\.\./g, '');

      /* delete numeric annotation glyphs */
      ms = ms.replace(/\$\d+/g, '');

      /* trim and get array of moves */
      var moves = trim(ms).split(new RegExp(/\s+/));

      /* delete empty entries */
      moves = moves.join(',').replace(/,,+/g, ',').split(',');
      var move = '';
      var result = '';
      for (var half_move = 0; half_move < moves.length; half_move++) {
        var comment = decode_comment(moves[half_move]);
        if (comment !== undefined) {
          comments[generate_fen()] = comment;
          continue;
        }
        move = move_from_san(moves[half_move], sloppy);

        /* invalid move */
        if (move == null) {
          /* was the move an end of game marker */
          if (TERMINATION_MARKERS.indexOf(moves[half_move]) > -1) {
            result = moves[half_move];
          } else {
            return false;
          }
        } else {
          /* reset the end of game marker if making a valid move */
          result = '';
          make_move(move);
        }
      }

      /* Per section 8.2.6 of the PGN spec, the Result tag pair must match
       * match the termination marker. Only do this when headers are present,
       * but the result tag is missing
       */
      if (result && Object.keys(header).length && !header['Result']) {
        set_header(['Result', result]);
      }
      return true;
    },
    header: function header() {
      return set_header(arguments);
    },
    turn: function turn() {
      return _turn;
    },
    move: function move(_move, options) {
      /* The move function can be called with in the following parameters:
       *
       * .move('Nxb7')      <- where 'move' is a case-sensitive SAN string
       *
       * .move({ from: 'h7', <- where the 'move' is a move object (additional
       *         to :'h8',      fields are ignored)
       *         promotion: 'q',
       *      })
       */

      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = typeof options !== 'undefined' && 'sloppy' in options ? options.sloppy : false;
      var move_obj = null;
      if (typeof _move === 'string') {
        move_obj = move_from_san(_move, sloppy);
      } else if (_typeof(_move) === 'object') {
        var moves = generate_moves();

        /* convert the pretty move object to an ugly move object */
        for (var i = 0, len = moves.length; i < len; i++) {
          if (_move.from === algebraic(moves[i].from) && _move.to === algebraic(moves[i].to) && (!('promotion' in moves[i]) || _move.promotion === moves[i].promotion)) {
            move_obj = moves[i];
            break;
          }
        }
      }

      /* failed to find move */
      if (!move_obj) {
        return null;
      }

      /* need to make a copy of move because we can't generate SAN after the
       * move is made
       */
      var pretty_move = make_pretty(move_obj);
      make_move(move_obj);
      return pretty_move;
    },
    undo: function undo() {
      var move = undo_move();
      return move ? make_pretty(move) : null;
    },
    clear: function clear() {
      return _clear();
    },
    put: function put(piece, square) {
      return _put(piece, square);
    },
    get: function get(square) {
      return _get(square);
    },
    ascii: function ascii() {
      var s = '   +------------------------+\n';
      for (var i = SQUARE_MAP.a8; i <= SQUARE_MAP.h1; i++) {
        /* display the rank */
        if (file(i) === 0) {
          s += ' ' + '87654321'[rank(i)] + ' |';
        }

        /* empty piece */
        if (_board[i] == null) {
          s += ' . ';
        } else {
          var piece = _board[i].type;
          var color = _board[i].color;
          var symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
          s += ' ' + symbol + ' ';
        }
        if (i + 1 & 0x88) {
          s += '|\n';
          i += 8;
        }
      }
      s += '   +------------------------+\n';
      s += '     a  b  c  d  e  f  g  h';
      return s;
    },
    remove: function remove(square) {
      return _remove(square);
    },
    perft: function perft(depth) {
      return _perft(depth);
    },
    square_color: function square_color(square) {
      if (square in SQUARE_MAP) {
        var sq_0x88 = SQUARE_MAP[square];
        return (rank(sq_0x88) + file(sq_0x88)) % 2 === 0 ? 'light' : 'dark';
      }
      return null;
    },
    history: function history(options) {
      var reversed_history = [];
      var move_history = [];
      var verbose = typeof options !== 'undefined' && 'verbose' in options && options.verbose;
      while (_history.length > 0) {
        reversed_history.push(undo_move());
      }
      while (reversed_history.length > 0) {
        var move = reversed_history.pop();
        if (verbose) {
          move_history.push(make_pretty(move));
        } else {
          move_history.push(move_to_san(move, generate_moves({
            legal: true
          })));
        }
        make_move(move);
      }
      return move_history;
    },
    get_comment: function get_comment() {
      return comments[generate_fen()];
    },
    set_comment: function set_comment(comment) {
      comments[generate_fen()] = comment.replace('{', '[').replace('}', ']');
    },
    delete_comment: function delete_comment() {
      var comment = comments[generate_fen()];
      delete comments[generate_fen()];
      return comment;
    },
    get_comments: function get_comments() {
      prune_comments();
      return Object.keys(comments).map(function (fen) {
        return {
          fen: fen,
          comment: comments[fen]
        };
      });
    },
    delete_comments: function delete_comments() {
      prune_comments();
      return Object.keys(comments).map(function (fen) {
        var comment = comments[fen];
        delete comments[fen];
        return {
          fen: fen,
          comment: comment
        };
      });
    }
  };
};
