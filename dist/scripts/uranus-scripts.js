/**
  A small, fast and advanced PNG / APNG encoder and decoder.
  https://github.com/photopea/UPNG.js/
  This code is MIT licensed.
**/
var UPNG = {};
UPNG.toRGBA8 = function (out) {
    var w = out.width, h = out.height;
    if (out.tabs.acTL == null)
        return [UPNG.toRGBA8.decodeImage(out.data, w, h, out).buffer];
    var frms = [];
    if (out.frames[0].data == null)
        out.frames[0].data = out.data;
    var len = w * h * 4, img = new Uint8Array(len), empty = new Uint8Array(len), prev = new Uint8Array(len);
    for (var i = 0; i < out.frames.length; i++) {
        var frm = out.frames[i];
        var fx = frm.rect.x, fy = frm.rect.y, fw = frm.rect.width, fh = frm.rect.height;
        var fdata = UPNG.toRGBA8.decodeImage(frm.data, fw, fh, out);
        if (i != 0)
            for (var j = 0; j < len; j++)
                prev[j] = img[j];
        if (frm.blend == 0)
            UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 0);
        else if (frm.blend == 1)
            UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 1);
        frms.push(img.buffer.slice(0));
        if (frm.dispose == 0) { }
        else if (frm.dispose == 1)
            UPNG._copyTile(empty, fw, fh, img, w, h, fx, fy, 0);
        else if (frm.dispose == 2)
            for (var j = 0; j < len; j++)
                img[j] = prev[j];
    }
    return frms;
};
UPNG.toRGBA8.decodeImage = function (data, w, h, out) {
    var area = w * h, bpp = UPNG.decode._getBPP(out);
    var bpl = Math.ceil(w * bpp / 8); // bytes per line
    var bf = new Uint8Array(area * 4), bf32 = new Uint32Array(bf.buffer);
    var ctype = out.ctype, depth = out.depth;
    var rs = UPNG._bin.readUshort;
    //console.log(ctype, depth);
    var time = Date.now();
    if (ctype == 6) { // RGB + alpha
        var qarea = area << 2;
        if (depth == 8)
            for (var i = 0; i < qarea; i += 4) {
                bf[i] = data[i];
                bf[i + 1] = data[i + 1];
                bf[i + 2] = data[i + 2];
                bf[i + 3] = data[i + 3];
            }
        if (depth == 16)
            for (var i = 0; i < qarea; i++) {
                bf[i] = data[i << 1];
            }
    }
    else if (ctype == 2) { // RGB
        var ts = out.tabs["tRNS"];
        if (ts == null) {
            if (depth == 8)
                for (var i = 0; i < area; i++) {
                    var ti = i * 3;
                    bf32[i] = (255 << 24) | (data[ti + 2] << 16) | (data[ti + 1] << 8) | data[ti];
                }
            if (depth == 16)
                for (var i = 0; i < area; i++) {
                    var ti = i * 6;
                    bf32[i] = (255 << 24) | (data[ti + 4] << 16) | (data[ti + 2] << 8) | data[ti];
                }
        }
        else {
            var tr = ts[0], tg = ts[1], tb = ts[2];
            if (depth == 8)
                for (var i = 0; i < area; i++) {
                    var qi = i << 2, ti = i * 3;
                    bf32[i] = (255 << 24) | (data[ti + 2] << 16) | (data[ti + 1] << 8) | data[ti];
                    if (data[ti] == tr && data[ti + 1] == tg && data[ti + 2] == tb)
                        bf[qi + 3] = 0;
                }
            if (depth == 16)
                for (var i = 0; i < area; i++) {
                    var qi = i << 2, ti = i * 6;
                    bf32[i] = (255 << 24) | (data[ti + 4] << 16) | (data[ti + 2] << 8) | data[ti];
                    if (rs(data, ti) == tr && rs(data, ti + 2) == tg && rs(data, ti + 4) == tb)
                        bf[qi + 3] = 0;
                }
        }
    }
    else if (ctype == 3) { // palette
        var p = out.tabs["PLTE"], ap = out.tabs["tRNS"], tl = ap ? ap.length : 0;
        //console.log(p, ap);
        if (depth == 1)
            for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                    var qi = (t0 + i) << 2, j = ((data[s0 + (i >> 3)] >> (7 - ((i & 7) << 0))) & 1), cj = 3 * j;
                    bf[qi] = p[cj];
                    bf[qi + 1] = p[cj + 1];
                    bf[qi + 2] = p[cj + 2];
                    bf[qi + 3] = (j < tl) ? ap[j] : 255;
                }
            }
        if (depth == 2)
            for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                    var qi = (t0 + i) << 2, j = ((data[s0 + (i >> 2)] >> (6 - ((i & 3) << 1))) & 3), cj = 3 * j;
                    bf[qi] = p[cj];
                    bf[qi + 1] = p[cj + 1];
                    bf[qi + 2] = p[cj + 2];
                    bf[qi + 3] = (j < tl) ? ap[j] : 255;
                }
            }
        if (depth == 4)
            for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                    var qi = (t0 + i) << 2, j = ((data[s0 + (i >> 1)] >> (4 - ((i & 1) << 2))) & 15), cj = 3 * j;
                    bf[qi] = p[cj];
                    bf[qi + 1] = p[cj + 1];
                    bf[qi + 2] = p[cj + 2];
                    bf[qi + 3] = (j < tl) ? ap[j] : 255;
                }
            }
        if (depth == 8)
            for (var i = 0; i < area; i++) {
                var qi = i << 2, j = data[i], cj = 3 * j;
                bf[qi] = p[cj];
                bf[qi + 1] = p[cj + 1];
                bf[qi + 2] = p[cj + 2];
                bf[qi + 3] = (j < tl) ? ap[j] : 255;
            }
    }
    else if (ctype == 4) { // gray + alpha
        if (depth == 8)
            for (var i = 0; i < area; i++) {
                var qi = i << 2, di = i << 1, gr = data[di];
                bf[qi] = gr;
                bf[qi + 1] = gr;
                bf[qi + 2] = gr;
                bf[qi + 3] = data[di + 1];
            }
        if (depth == 16)
            for (var i = 0; i < area; i++) {
                var qi = i << 2, di = i << 2, gr = data[di];
                bf[qi] = gr;
                bf[qi + 1] = gr;
                bf[qi + 2] = gr;
                bf[qi + 3] = data[di + 2];
            }
    }
    else if (ctype == 0) { // gray
        var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
        for (var y = 0; y < h; y++) {
            var off = y * bpl, to = y * w;
            if (depth == 1)
                for (var x = 0; x < w; x++) {
                    var gr = 255 * ((data[off + (x >>> 3)] >>> (7 - ((x & 7)))) & 1), al = (gr == tr * 255) ? 0 : 255;
                    bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
                }
            else if (depth == 2)
                for (var x = 0; x < w; x++) {
                    var gr = 85 * ((data[off + (x >>> 2)] >>> (6 - ((x & 3) << 1))) & 3), al = (gr == tr * 85) ? 0 : 255;
                    bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
                }
            else if (depth == 4)
                for (var x = 0; x < w; x++) {
                    var gr = 17 * ((data[off + (x >>> 1)] >>> (4 - ((x & 1) << 2))) & 15), al = (gr == tr * 17) ? 0 : 255;
                    bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
                }
            else if (depth == 8)
                for (var x = 0; x < w; x++) {
                    var gr = data[off + x], al = (gr == tr) ? 0 : 255;
                    bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
                }
            else if (depth == 16)
                for (var x = 0; x < w; x++) {
                    var gr = data[off + (x << 1)], al = (rs(data, off + (x << i)) == tr) ? 0 : 255;
                    bf32[to + x] = (al << 24) | (gr << 16) | (gr << 8) | gr;
                }
        }
    }
    //console.log(Date.now()-time);
    return bf;
};
UPNG.decode = function (buff) {
    var data = new Uint8Array(buff), offset = 8, bin = UPNG._bin, rUs = bin.readUshort, rUi = bin.readUint;
    var out = { tabs: {}, frames: [] };
    var dd = new Uint8Array(data.length), doff = 0; // put all IDAT data into it
    var fd, foff = 0; // frames
    var mgck = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (var i = 0; i < 8; i++)
        if (data[i] != mgck[i])
            throw "The input is not a PNG file!";
    while (offset < data.length) {
        var len = bin.readUint(data, offset);
        offset += 4;
        var type = bin.readASCII(data, offset, 4);
        offset += 4;
        //console.log(type,len);
        if (type == "IHDR") {
            UPNG.decode._IHDR(data, offset, out);
        }
        else if (type == "IDAT") {
            for (var i = 0; i < len; i++)
                dd[doff + i] = data[offset + i];
            doff += len;
        }
        else if (type == "acTL") {
            out.tabs[type] = { num_frames: rUi(data, offset), num_plays: rUi(data, offset + 4) };
            fd = new Uint8Array(data.length);
        }
        else if (type == "fcTL") {
            if (foff != 0) {
                var fr = out.frames[out.frames.length - 1];
                fr.data = UPNG.decode._decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height);
                foff = 0;
            }
            var rct = { x: rUi(data, offset + 12), y: rUi(data, offset + 16), width: rUi(data, offset + 4), height: rUi(data, offset + 8) };
            var del = rUs(data, offset + 22);
            del = rUs(data, offset + 20) / (del == 0 ? 100 : del);
            var frm = { rect: rct, delay: Math.round(del * 1000), dispose: data[offset + 24], blend: data[offset + 25] };
            //console.log(frm);
            out.frames.push(frm);
        }
        else if (type == "fdAT") {
            for (var i = 0; i < len - 4; i++)
                fd[foff + i] = data[offset + i + 4];
            foff += len - 4;
        }
        else if (type == "pHYs") {
            out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset + 4), data[offset + 8]];
        }
        else if (type == "cHRM") {
            out.tabs[type] = [];
            for (var i = 0; i < 8; i++)
                out.tabs[type].push(bin.readUint(data, offset + i * 4));
        }
        else if (type == "tEXt") {
            if (out.tabs[type] == null)
                out.tabs[type] = {};
            var nz = bin.nextZero(data, offset);
            var keyw = bin.readASCII(data, offset, nz - offset);
            var text = bin.readASCII(data, nz + 1, offset + len - nz - 1);
            out.tabs[type][keyw] = text;
        }
        else if (type == "iTXt") {
            if (out.tabs[type] == null)
                out.tabs[type] = {};
            var nz = 0, off = offset;
            nz = bin.nextZero(data, off);
            var keyw = bin.readASCII(data, off, nz - off);
            off = nz + 1;
            var cflag = data[off], cmeth = data[off + 1];
            off += 2;
            nz = bin.nextZero(data, off);
            var ltag = bin.readASCII(data, off, nz - off);
            off = nz + 1;
            nz = bin.nextZero(data, off);
            var tkeyw = bin.readUTF8(data, off, nz - off);
            off = nz + 1;
            var text = bin.readUTF8(data, off, len - (off - offset));
            out.tabs[type][keyw] = text;
        }
        else if (type == "PLTE") {
            out.tabs[type] = bin.readBytes(data, offset, len);
        }
        else if (type == "hIST") {
            var pl = out.tabs["PLTE"].length / 3;
            out.tabs[type] = [];
            for (var i = 0; i < pl; i++)
                out.tabs[type].push(rUs(data, offset + i * 2));
        }
        else if (type == "tRNS") {
            if (out.ctype == 3)
                out.tabs[type] = bin.readBytes(data, offset, len);
            else if (out.ctype == 0)
                out.tabs[type] = rUs(data, offset);
            else if (out.ctype == 2)
                out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
            //else console.log("tRNS for unsupported color type",out.ctype, len);
        }
        else if (type == "gAMA")
            out.tabs[type] = bin.readUint(data, offset) / 100000;
        else if (type == "sRGB")
            out.tabs[type] = data[offset];
        else if (type == "bKGD") {
            if (out.ctype == 0 || out.ctype == 4)
                out.tabs[type] = [rUs(data, offset)];
            else if (out.ctype == 2 || out.ctype == 6)
                out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
            else if (out.ctype == 3)
                out.tabs[type] = data[offset];
        }
        else if (type == "IEND") {
            break;
        }
        //else {  log("unknown chunk type", type, len);  }
        offset += len;
        var crc = bin.readUint(data, offset);
        offset += 4;
    }
    if (foff != 0) {
        var fr = out.frames[out.frames.length - 1];
        fr.data = UPNG.decode._decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height);
        foff = 0;
    }
    out.data = UPNG.decode._decompress(out, dd, out.width, out.height);
    delete out.compress;
    delete out.interlace;
    delete out.filter;
    return out;
};
UPNG.decode._decompress = function (out, dd, w, h) {
    var time = Date.now();
    var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w * bpp / 8), buff = new Uint8Array((bpl + 1 + out.interlace) * h);
    dd = UPNG.decode._inflate(dd, buff);
    //console.log(dd.length, buff.length);
    //console.log(Date.now()-time);
    var time = Date.now();
    if (out.interlace == 0)
        dd = UPNG.decode._filterZero(dd, out, 0, w, h);
    else if (out.interlace == 1)
        dd = UPNG.decode._readInterlace(dd, out);
    //console.log(Date.now()-time);
    return dd;
};
UPNG.decode._inflate = function (data, buff) { var out = UPNG["inflateRaw"](new Uint8Array(data.buffer, 2, data.length - 6), buff); return out; };
UPNG.inflateRaw = function () {
    var H = {};
    H.H = {};
    H.H.N = function (N, W) {
        var R = Uint8Array, i = 0, m = 0, J = 0, h = 0, Q = 0, X = 0, u = 0, w = 0, d = 0, v, C;
        if (N[0] == 3 && N[1] == 0)
            return W ? W : new R(0);
        var V = H.H, n = V.b, A = V.e, l = V.R, M = V.n, I = V.A, e = V.Z, b = V.m, Z = W == null;
        if (Z)
            W = new R(N.length >>> 2 << 3);
        while (i == 0) {
            i = n(N, d, 1);
            m = n(N, d + 1, 2);
            d += 3;
            if (m == 0) {
                if ((d & 7) != 0)
                    d += 8 - (d & 7);
                var D = (d >>> 3) + 4, q = N[D - 4] | N[D - 3] << 8;
                if (Z)
                    W = H.H.W(W, w + q);
                W.set(new R(N.buffer, N.byteOffset + D, q), w);
                d = D + q << 3;
                w += q;
                continue;
            }
            if (Z)
                W = H.H.W(W, w + (1 << 17));
            if (m == 1) {
                v = b.J;
                C = b.h;
                X = (1 << 9) - 1;
                u = (1 << 5) - 1;
            }
            if (m == 2) {
                J = A(N, d, 5) + 257;
                h = A(N, d + 5, 5) + 1;
                Q = A(N, d + 10, 4) + 4;
                d += 14;
                var E = d, j = 1;
                for (var c = 0; c < 38; c += 2) {
                    b.Q[c] = 0;
                    b.Q[c + 1] = 0;
                }
                for (var c = 0; c < Q; c++) {
                    var K = A(N, d + c * 3, 3);
                    b.Q[(b.X[c] << 1) + 1] = K;
                    if (K > j)
                        j = K;
                }
                d += 3 * Q;
                M(b.Q, j);
                I(b.Q, j, b.u);
                v = b.w;
                C = b.d;
                d = l(b.u, (1 << j) - 1, J + h, N, d, b.v);
                var r = V.V(b.v, 0, J, b.C);
                X = (1 << r) - 1;
                var S = V.V(b.v, J, h, b.D);
                u = (1 << S) - 1;
                M(b.C, r);
                I(b.C, r, v);
                M(b.D, S);
                I(b.D, S, C);
            }
            while (!0) {
                var T = v[e(N, d) & X];
                d += T & 15;
                var p = T >>> 4;
                if (p >>> 8 == 0) {
                    W[w++] = p;
                }
                else if (p == 256) {
                    break;
                }
                else {
                    var z = w + p - 254;
                    if (p > 264) {
                        var _ = b.q[p - 257];
                        z = w + (_ >>> 3) + A(N, d, _ & 7);
                        d += _ & 7;
                    }
                    var $ = C[e(N, d) & u];
                    d += $ & 15;
                    var s = $ >>> 4, Y = b.c[s], a = (Y >>> 4) + n(N, d, Y & 15);
                    d += Y & 15;
                    while (w < z) {
                        W[w] = W[w++ - a];
                        W[w] = W[w++ - a];
                        W[w] = W[w++ - a];
                        W[w] = W[w++ - a];
                    }
                    w = z;
                }
            }
        }
        return W.length == w ? W : W.slice(0, w);
    };
    H.H.W = function (N, W) { var R = N.length; if (W <= R)
        return N; var V = new Uint8Array(R << 1); V.set(N, 0); return V; };
    H.H.R = function (N, W, R, V, n, A) {
        var l = H.H.e, M = H.H.Z, I = 0;
        while (I < R) {
            var e = N[M(V, n) & W];
            n += e & 15;
            var b = e >>> 4;
            if (b <= 15) {
                A[I] = b;
                I++;
            }
            else {
                var Z = 0, m = 0;
                if (b == 16) {
                    m = 3 + l(V, n, 2);
                    n += 2;
                    Z = A[I - 1];
                }
                else if (b == 17) {
                    m = 3 + l(V, n, 3);
                    n += 3;
                }
                else if (b == 18) {
                    m = 11 + l(V, n, 7);
                    n += 7;
                }
                var J = I + m;
                while (I < J) {
                    A[I] = Z;
                    I++;
                }
            }
        }
        return n;
    };
    H.H.V = function (N, W, R, V) {
        var n = 0, A = 0, l = V.length >>> 1;
        while (A < R) {
            var M = N[A + W];
            V[A << 1] = 0;
            V[(A << 1) + 1] = M;
            if (M > n)
                n = M;
            A++;
        }
        while (A < l) {
            V[A << 1] = 0;
            V[(A << 1) + 1] = 0;
            A++;
        }
        return n;
    };
    H.H.n = function (N, W) {
        var R = H.H.m, V = N.length, n, A, l, M, I, e = R.j;
        for (var M = 0; M <= W; M++)
            e[M] = 0;
        for (M = 1; M < V; M += 2)
            e[N[M]]++;
        var b = R.K;
        n = 0;
        e[0] = 0;
        for (A = 1; A <= W; A++) {
            n = n + e[A - 1] << 1;
            b[A] = n;
        }
        for (l = 0; l < V; l += 2) {
            I = N[l + 1];
            if (I != 0) {
                N[l] = b[I];
                b[I]++;
            }
        }
    };
    H.H.A = function (N, W, R) {
        var V = N.length, n = H.H.m, A = n.r;
        for (var l = 0; l < V; l += 2)
            if (N[l + 1] != 0) {
                var M = l >> 1, I = N[l + 1], e = M << 4 | I, b = W - I, Z = N[l] << b, m = Z + (1 << b);
                while (Z != m) {
                    var J = A[Z] >>> 15 - W;
                    R[J] = e;
                    Z++;
                }
            }
    };
    H.H.l = function (N, W) {
        var R = H.H.m.r, V = 15 - W;
        for (var n = 0; n < N.length; n += 2) {
            var A = N[n] << W - N[n + 1];
            N[n] = R[A] >>> V;
        }
    };
    H.H.M = function (N, W, R) { R = R << (W & 7); var V = W >>> 3; N[V] |= R; N[V + 1] |= R >>> 8; };
    H.H.I = function (N, W, R) { R = R << (W & 7); var V = W >>> 3; N[V] |= R; N[V + 1] |= R >>> 8; N[V + 2] |= R >>> 16; };
    H.H.e = function (N, W, R) { return (N[W >>> 3] | N[(W >>> 3) + 1] << 8) >>> (W & 7) & (1 << R) - 1; };
    H.H.b = function (N, W, R) { return (N[W >>> 3] | N[(W >>> 3) + 1] << 8 | N[(W >>> 3) + 2] << 16) >>> (W & 7) & (1 << R) - 1; };
    H.H.Z = function (N, W) { return (N[W >>> 3] | N[(W >>> 3) + 1] << 8 | N[(W >>> 3) + 2] << 16) >>> (W & 7); };
    H.H.i = function (N, W) { return (N[W >>> 3] | N[(W >>> 3) + 1] << 8 | N[(W >>> 3) + 2] << 16 | N[(W >>> 3) + 3] << 24) >>> (W & 7); };
    H.H.m = function () {
        var N = Uint16Array, W = Uint32Array;
        return { K: new N(16), j: new N(16), X: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], S: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 999, 999, 999], T: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0], q: new N(32), p: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 65535, 65535], z: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0], c: new W(32), J: new N(512), _: [], h: new N(32), $: [], w: new N(32768), C: [], v: [], d: new N(32768), D: [], u: new N(512), Q: [], r: new N(1 << 15), s: new W(286), Y: new W(30), a: new W(19), t: new W(15e3), k: new N(1 << 16), g: new N(1 << 15) };
    }();
    (function () {
        var N = H.H.m, W = 1 << 15;
        for (var R = 0; R < W; R++) {
            var V = R;
            V = (V & 2863311530) >>> 1 | (V & 1431655765) << 1;
            V = (V & 3435973836) >>> 2 | (V & 858993459) << 2;
            V = (V & 4042322160) >>> 4 | (V & 252645135) << 4;
            V = (V & 4278255360) >>> 8 | (V & 16711935) << 8;
            N.r[R] = (V >>> 16 | V << 16) >>> 17;
        }
        function n(A, l, M) { while (l-- != 0)
            A.push(0, M); }
        for (var R = 0; R < 32; R++) {
            N.q[R] = N.S[R] << 3 | N.T[R];
            N.c[R] = N.p[R] << 4 | N.z[R];
        }
        n(N._, 144, 8);
        n(N._, 255 - 143, 9);
        n(N._, 279 - 255, 7);
        n(N._, 287 - 279, 8);
        H.H.n(N._, 9);
        H.H.A(N._, 9, N.J);
        H.H.l(N._, 9);
        n(N.$, 32, 5);
        H.H.n(N.$, 5);
        H.H.A(N.$, 5, N.h);
        H.H.l(N.$, 5);
        n(N.Q, 19, 0);
        n(N.C, 286, 0);
        n(N.D, 30, 0);
        n(N.v, 320, 0);
    }());
    return H.H.N;
}();
UPNG.decode._readInterlace = function (data, out) {
    var w = out.width, h = out.height;
    var bpp = UPNG.decode._getBPP(out), cbpp = bpp >> 3, bpl = Math.ceil(w * bpp / 8);
    var img = new Uint8Array(h * bpl);
    var di = 0;
    var starting_row = [0, 0, 4, 0, 2, 0, 1];
    var starting_col = [0, 4, 0, 2, 0, 1, 0];
    var row_increment = [8, 8, 8, 4, 4, 2, 2];
    var col_increment = [8, 8, 4, 4, 2, 2, 1];
    var pass = 0;
    while (pass < 7) {
        var ri = row_increment[pass], ci = col_increment[pass];
        var sw = 0, sh = 0;
        var cr = starting_row[pass];
        while (cr < h) {
            cr += ri;
            sh++;
        }
        var cc = starting_col[pass];
        while (cc < w) {
            cc += ci;
            sw++;
        }
        var bpll = Math.ceil(sw * bpp / 8);
        UPNG.decode._filterZero(data, out, di, sw, sh);
        var y = 0, row = starting_row[pass];
        while (row < h) {
            var col = starting_col[pass];
            var cdi = (di + y * bpll) << 3;
            while (col < w) {
                if (bpp == 1) {
                    var val = data[cdi >> 3];
                    val = (val >> (7 - (cdi & 7))) & 1;
                    img[row * bpl + (col >> 3)] |= (val << (7 - ((col & 7) << 0)));
                }
                if (bpp == 2) {
                    var val = data[cdi >> 3];
                    val = (val >> (6 - (cdi & 7))) & 3;
                    img[row * bpl + (col >> 2)] |= (val << (6 - ((col & 3) << 1)));
                }
                if (bpp == 4) {
                    var val = data[cdi >> 3];
                    val = (val >> (4 - (cdi & 7))) & 15;
                    img[row * bpl + (col >> 1)] |= (val << (4 - ((col & 1) << 2)));
                }
                if (bpp >= 8) {
                    var ii = row * bpl + col * cbpp;
                    for (var j = 0; j < cbpp; j++)
                        img[ii + j] = data[(cdi >> 3) + j];
                }
                cdi += bpp;
                col += ci;
            }
            y++;
            row += ri;
        }
        if (sw * sh != 0)
            di += sh * (1 + bpll);
        pass = pass + 1;
    }
    return img;
};
UPNG.decode._getBPP = function (out) {
    var noc = [1, null, 3, 1, 2, null, 4][out.ctype];
    return noc * out.depth;
};
UPNG.decode._filterZero = function (data, out, off, w, h) {
    var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w * bpp / 8), paeth = UPNG.decode._paeth;
    bpp = Math.ceil(bpp / 8);
    var i = 0, di = 1, type = data[off], x = 0;
    if (type > 1)
        data[off] = [0, 0, 1][type - 2];
    if (type == 3)
        for (x = bpp; x < bpl; x++)
            data[x + 1] = (data[x + 1] + (data[x + 1 - bpp] >>> 1)) & 255;
    for (var y = 0; y < h; y++) {
        i = off + y * bpl;
        di = i + y + 1;
        type = data[di - 1];
        x = 0;
        if (type == 0)
            for (; x < bpl; x++)
                data[i + x] = data[di + x];
        else if (type == 1) {
            for (; x < bpp; x++)
                data[i + x] = data[di + x];
            for (; x < bpl; x++)
                data[i + x] = (data[di + x] + data[i + x - bpp]);
        }
        else if (type == 2) {
            for (; x < bpl; x++)
                data[i + x] = (data[di + x] + data[i + x - bpl]);
        }
        else if (type == 3) {
            for (; x < bpp; x++)
                data[i + x] = (data[di + x] + (data[i + x - bpl] >>> 1));
            for (; x < bpl; x++)
                data[i + x] = (data[di + x] + ((data[i + x - bpl] + data[i + x - bpp]) >>> 1));
        }
        else {
            for (; x < bpp; x++)
                data[i + x] = (data[di + x] + paeth(0, data[i + x - bpl], 0));
            for (; x < bpl; x++)
                data[i + x] = (data[di + x] + paeth(data[i + x - bpp], data[i + x - bpl], data[i + x - bpp - bpl]));
        }
    }
    return data;
};
UPNG.decode._paeth = function (a, b, c) {
    var p = a + b - c, pa = (p - a), pb = (p - b), pc = (p - c);
    if (pa * pa <= pb * pb && pa * pa <= pc * pc)
        return a;
    else if (pb * pb <= pc * pc)
        return b;
    return c;
};
UPNG.decode._IHDR = function (data, offset, out) {
    var bin = UPNG._bin;
    out.width = bin.readUint(data, offset);
    offset += 4;
    out.height = bin.readUint(data, offset);
    offset += 4;
    out.depth = data[offset];
    offset++;
    out.ctype = data[offset];
    offset++;
    out.compress = data[offset];
    offset++;
    out.filter = data[offset];
    offset++;
    out.interlace = data[offset];
    offset++;
};
UPNG._bin = {
    nextZero: function (data, p) { while (data[p] != 0)
        p++; return p; },
    readUshort: function (buff, p) { return (buff[p] << 8) | buff[p + 1]; },
    writeUshort: function (buff, p, n) { buff[p] = (n >> 8) & 255; buff[p + 1] = n & 255; },
    readUint: function (buff, p) { return (buff[p] * (256 * 256 * 256)) + ((buff[p + 1] << 16) | (buff[p + 2] << 8) | buff[p + 3]); },
    writeUint: function (buff, p, n) { buff[p] = (n >> 24) & 255; buff[p + 1] = (n >> 16) & 255; buff[p + 2] = (n >> 8) & 255; buff[p + 3] = n & 255; },
    readASCII: function (buff, p, l) { var s = ""; for (var i = 0; i < l; i++)
        s += String.fromCharCode(buff[p + i]); return s; },
    writeASCII: function (data, p, s) { for (var i = 0; i < s.length; i++)
        data[p + i] = s.charCodeAt(i); },
    readBytes: function (buff, p, l) { var arr = []; for (var i = 0; i < l; i++)
        arr.push(buff[p + i]); return arr; },
    pad: function (n) { return n.length < 2 ? "0" + n : n; },
    readUTF8: function (buff, p, l) {
        var s = "", ns;
        for (var i = 0; i < l; i++)
            s += "%" + UPNG._bin.pad(buff[p + i].toString(16));
        try {
            ns = decodeURIComponent(s);
        }
        catch (e) {
            return UPNG._bin.readASCII(buff, p, l);
        }
        return ns;
    }
};
UPNG._copyTile = function (sb, sw, sh, tb, tw, th, xoff, yoff, mode) {
    var w = Math.min(sw, tw), h = Math.min(sh, th);
    var si = 0, ti = 0;
    for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
            if (xoff >= 0 && yoff >= 0) {
                si = (y * sw + x) << 2;
                ti = ((yoff + y) * tw + xoff + x) << 2;
            }
            else {
                si = ((-yoff + y) * sw - xoff + x) << 2;
                ti = (y * tw + x) << 2;
            }
            if (mode == 0) {
                tb[ti] = sb[si];
                tb[ti + 1] = sb[si + 1];
                tb[ti + 2] = sb[si + 2];
                tb[ti + 3] = sb[si + 3];
            }
            else if (mode == 1) {
                var fa = sb[si + 3] * (1 / 255), fr = sb[si] * fa, fg = sb[si + 1] * fa, fb = sb[si + 2] * fa;
                var ba = tb[ti + 3] * (1 / 255), br = tb[ti] * ba, bg = tb[ti + 1] * ba, bb = tb[ti + 2] * ba;
                var ifa = 1 - fa, oa = fa + ba * ifa, ioa = (oa == 0 ? 0 : 1 / oa);
                tb[ti + 3] = 255 * oa;
                tb[ti + 0] = (fr + br * ifa) * ioa;
                tb[ti + 1] = (fg + bg * ifa) * ioa;
                tb[ti + 2] = (fb + bb * ifa) * ioa;
            }
            else if (mode == 2) { // copy only differences, otherwise zero
                var fa = sb[si + 3], fr = sb[si], fg = sb[si + 1], fb = sb[si + 2];
                var ba = tb[ti + 3], br = tb[ti], bg = tb[ti + 1], bb = tb[ti + 2];
                if (fa == ba && fr == br && fg == bg && fb == bb) {
                    tb[ti] = 0;
                    tb[ti + 1] = 0;
                    tb[ti + 2] = 0;
                    tb[ti + 3] = 0;
                }
                else {
                    tb[ti] = fr;
                    tb[ti + 1] = fg;
                    tb[ti + 2] = fb;
                    tb[ti + 3] = fa;
                }
            }
            else if (mode == 3) { // check if can be blended
                var fa = sb[si + 3], fr = sb[si], fg = sb[si + 1], fb = sb[si + 2];
                var ba = tb[ti + 3], br = tb[ti], bg = tb[ti + 1], bb = tb[ti + 2];
                if (fa == ba && fr == br && fg == bg && fb == bb)
                    continue;
                //if(fa!=255 && ba!=0) return false;
                if (fa < 220 && ba > 20)
                    return false;
            }
        }
    return true;
};
UPNG.encode = function (bufs, w, h, ps, dels, tabs, forbidPlte) {
    if (ps == null)
        ps = 0;
    if (forbidPlte == null)
        forbidPlte = false;
    var nimg = UPNG.encode.compress(bufs, w, h, ps, [false, false, false, 0, forbidPlte]);
    UPNG.encode.compressPNG(nimg, -1);
    return UPNG.encode._main(nimg, w, h, dels, tabs);
};
UPNG.encodeLL = function (bufs, w, h, cc, ac, depth, dels, tabs) {
    var nimg = { ctype: 0 + (cc == 1 ? 0 : 2) + (ac == 0 ? 0 : 4), depth: depth, frames: [] };
    var time = Date.now();
    var bipp = (cc + ac) * depth, bipl = bipp * w;
    for (var i = 0; i < bufs.length; i++)
        nimg.frames.push({ rect: { x: 0, y: 0, width: w, height: h }, img: new Uint8Array(bufs[i]), blend: 0, dispose: 1, bpp: Math.ceil(bipp / 8), bpl: Math.ceil(bipl / 8) });
    UPNG.encode.compressPNG(nimg, 0, true);
    var out = UPNG.encode._main(nimg, w, h, dels, tabs);
    return out;
};
UPNG.encode._main = function (nimg, w, h, dels, tabs) {
    if (tabs == null)
        tabs = {};
    var crc = UPNG.crc.crc, wUi = UPNG._bin.writeUint, wUs = UPNG._bin.writeUshort, wAs = UPNG._bin.writeASCII;
    var offset = 8, anim = nimg.frames.length > 1, pltAlpha = false;
    var leng = 8 + (16 + 5 + 4) /*+ (9+4)*/ + (anim ? 20 : 0);
    if (tabs["sRGB"] != null)
        leng += 8 + 1 + 4;
    if (tabs["pHYs"] != null)
        leng += 8 + 9 + 4;
    if (nimg.ctype == 3) {
        var dl = nimg.plte.length;
        for (var i = 0; i < dl; i++)
            if ((nimg.plte[i] >>> 24) != 255)
                pltAlpha = true;
        leng += (8 + dl * 3 + 4) + (pltAlpha ? (8 + dl * 1 + 4) : 0);
    }
    for (var j = 0; j < nimg.frames.length; j++) {
        var fr = nimg.frames[j];
        if (anim)
            leng += 38;
        leng += fr.cimg.length + 12;
        if (j != 0)
            leng += 4;
    }
    leng += 12;
    var data = new Uint8Array(leng);
    var wr = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (var i = 0; i < 8; i++)
        data[i] = wr[i];
    wUi(data, offset, 13);
    offset += 4;
    wAs(data, offset, "IHDR");
    offset += 4;
    wUi(data, offset, w);
    offset += 4;
    wUi(data, offset, h);
    offset += 4;
    data[offset] = nimg.depth;
    offset++; // depth
    data[offset] = nimg.ctype;
    offset++; // ctype
    data[offset] = 0;
    offset++; // compress
    data[offset] = 0;
    offset++; // filter
    data[offset] = 0;
    offset++; // interlace
    wUi(data, offset, crc(data, offset - 17, 17));
    offset += 4; // crc
    // 13 bytes to say, that it is sRGB
    if (tabs["sRGB"] != null) {
        wUi(data, offset, 1);
        offset += 4;
        wAs(data, offset, "sRGB");
        offset += 4;
        data[offset] = tabs["sRGB"];
        offset++;
        wUi(data, offset, crc(data, offset - 5, 5));
        offset += 4; // crc
    }
    if (tabs["pHYs"] != null) {
        wUi(data, offset, 9);
        offset += 4;
        wAs(data, offset, "pHYs");
        offset += 4;
        wUi(data, offset, tabs["pHYs"][0]);
        offset += 4;
        wUi(data, offset, tabs["pHYs"][1]);
        offset += 4;
        data[offset] = tabs["pHYs"][2];
        offset++;
        wUi(data, offset, crc(data, offset - 13, 13));
        offset += 4; // crc
    }
    if (anim) {
        wUi(data, offset, 8);
        offset += 4;
        wAs(data, offset, "acTL");
        offset += 4;
        wUi(data, offset, nimg.frames.length);
        offset += 4;
        wUi(data, offset, tabs["loop"] != null ? tabs["loop"] : 0);
        offset += 4;
        wUi(data, offset, crc(data, offset - 12, 12));
        offset += 4; // crc
    }
    if (nimg.ctype == 3) {
        var dl = nimg.plte.length;
        wUi(data, offset, dl * 3);
        offset += 4;
        wAs(data, offset, "PLTE");
        offset += 4;
        for (var i = 0; i < dl; i++) {
            var ti = i * 3, c = nimg.plte[i], r = (c) & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
            data[offset + ti + 0] = r;
            data[offset + ti + 1] = g;
            data[offset + ti + 2] = b;
        }
        offset += dl * 3;
        wUi(data, offset, crc(data, offset - dl * 3 - 4, dl * 3 + 4));
        offset += 4; // crc
        if (pltAlpha) {
            wUi(data, offset, dl);
            offset += 4;
            wAs(data, offset, "tRNS");
            offset += 4;
            for (var i = 0; i < dl; i++)
                data[offset + i] = (nimg.plte[i] >>> 24) & 255;
            offset += dl;
            wUi(data, offset, crc(data, offset - dl - 4, dl + 4));
            offset += 4; // crc
        }
    }
    var fi = 0;
    for (var j = 0; j < nimg.frames.length; j++) {
        var fr = nimg.frames[j];
        if (anim) {
            wUi(data, offset, 26);
            offset += 4;
            wAs(data, offset, "fcTL");
            offset += 4;
            wUi(data, offset, fi++);
            offset += 4;
            wUi(data, offset, fr.rect.width);
            offset += 4;
            wUi(data, offset, fr.rect.height);
            offset += 4;
            wUi(data, offset, fr.rect.x);
            offset += 4;
            wUi(data, offset, fr.rect.y);
            offset += 4;
            wUs(data, offset, dels[j]);
            offset += 2;
            wUs(data, offset, 1000);
            offset += 2;
            data[offset] = fr.dispose;
            offset++; // dispose
            data[offset] = fr.blend;
            offset++; // blend
            wUi(data, offset, crc(data, offset - 30, 30));
            offset += 4; // crc
        }
        var imgd = fr.cimg, dl = imgd.length;
        wUi(data, offset, dl + (j == 0 ? 0 : 4));
        offset += 4;
        var ioff = offset;
        wAs(data, offset, (j == 0) ? "IDAT" : "fdAT");
        offset += 4;
        if (j != 0) {
            wUi(data, offset, fi++);
            offset += 4;
        }
        data.set(imgd, offset);
        offset += dl;
        wUi(data, offset, crc(data, ioff, offset - ioff));
        offset += 4; // crc
    }
    wUi(data, offset, 0);
    offset += 4;
    wAs(data, offset, "IEND");
    offset += 4;
    wUi(data, offset, crc(data, offset - 4, 4));
    offset += 4; // crc
    return data.buffer;
};
UPNG.encode.compressPNG = function (out, filter, levelZero) {
    for (var i = 0; i < out.frames.length; i++) {
        var frm = out.frames[i], nw = frm.rect.width, nh = frm.rect.height;
        var fdata = new Uint8Array(nh * frm.bpl + nh);
        frm.cimg = UPNG.encode._filterZero(frm.img, nh, frm.bpp, frm.bpl, fdata, filter, levelZero);
    }
};
UPNG.encode.compress = function (bufs, w, h, ps, prms) {
    //var time = Date.now();
    var onlyBlend = prms[0], evenCrd = prms[1], forbidPrev = prms[2], minBits = prms[3], forbidPlte = prms[4];
    var ctype = 6, depth = 8, alphaAnd = 255;
    for (var j = 0; j < bufs.length; j++) { // when not quantized, other frames can contain colors, that are not in an initial frame
        var img = new Uint8Array(bufs[j]), ilen = img.length;
        for (var i = 0; i < ilen; i += 4)
            alphaAnd &= img[i + 3];
    }
    var gotAlpha = (alphaAnd != 255);
    //console.log("alpha check", Date.now()-time);  time = Date.now();
    //var brute = gotAlpha && forGIF;		// brute : frames can only be copied, not "blended"
    var frms = UPNG.encode.framize(bufs, w, h, onlyBlend, evenCrd, forbidPrev);
    //console.log("framize", Date.now()-time);  time = Date.now();
    var cmap = {}, plte = [], inds = [];
    if (ps != 0) {
        var nbufs = [];
        for (var i = 0; i < frms.length; i++)
            nbufs.push(frms[i].img.buffer);
        var abuf = UPNG.encode.concatRGBA(nbufs), qres = UPNG.quantize(abuf, ps);
        var cof = 0, bb = new Uint8Array(qres.abuf);
        for (var i = 0; i < frms.length; i++) {
            var ti = frms[i].img, bln = ti.length;
            inds.push(new Uint8Array(qres.inds.buffer, cof >> 2, bln >> 2));
            for (var j = 0; j < bln; j += 4) {
                ti[j] = bb[cof + j];
                ti[j + 1] = bb[cof + j + 1];
                ti[j + 2] = bb[cof + j + 2];
                ti[j + 3] = bb[cof + j + 3];
            }
            cof += bln;
        }
        for (var i = 0; i < qres.plte.length; i++)
            plte.push(qres.plte[i].est.rgba);
        //console.log("quantize", Date.now()-time);  time = Date.now();
    }
    else {
        // what if ps==0, but there are <=256 colors?  we still need to detect, if the palette could be used
        for (var j = 0; j < frms.length; j++) { // when not quantized, other frames can contain colors, that are not in an initial frame
            var frm = frms[j], img32 = new Uint32Array(frm.img.buffer), nw = frm.rect.width, ilen = img32.length;
            var ind = new Uint8Array(ilen);
            inds.push(ind);
            for (var i = 0; i < ilen; i++) {
                var c = img32[i];
                if (i != 0 && c == img32[i - 1])
                    ind[i] = ind[i - 1];
                else if (i > nw && c == img32[i - nw])
                    ind[i] = ind[i - nw];
                else {
                    var cmc = cmap[c];
                    if (cmc == null) {
                        cmap[c] = cmc = plte.length;
                        plte.push(c);
                        if (plte.length >= 300)
                            break;
                    }
                    ind[i] = cmc;
                }
            }
        }
        //console.log("make palette", Date.now()-time);  time = Date.now();
    }
    var cc = plte.length; //console.log("colors:",cc);
    if (cc <= 256 && forbidPlte == false) {
        if (cc <= 2)
            depth = 1;
        else if (cc <= 4)
            depth = 2;
        else if (cc <= 16)
            depth = 4;
        else
            depth = 8;
        depth = Math.max(depth, minBits);
    }
    for (var j = 0; j < frms.length; j++) {
        var frm = frms[j], nx = frm.rect.x, ny = frm.rect.y, nw = frm.rect.width, nh = frm.rect.height;
        var cimg = frm.img, cimg32 = new Uint32Array(cimg.buffer);
        var bpl = 4 * nw, bpp = 4;
        if (cc <= 256 && forbidPlte == false) {
            bpl = Math.ceil(depth * nw / 8);
            var nimg = new Uint8Array(bpl * nh);
            var inj = inds[j];
            for (var y = 0; y < nh; y++) {
                var i = y * bpl, ii = y * nw;
                if (depth == 8)
                    for (var x = 0; x < nw; x++)
                        nimg[i + (x)] = (inj[ii + x]);
                else if (depth == 4)
                    for (var x = 0; x < nw; x++)
                        nimg[i + (x >> 1)] |= (inj[ii + x] << (4 - (x & 1) * 4));
                else if (depth == 2)
                    for (var x = 0; x < nw; x++)
                        nimg[i + (x >> 2)] |= (inj[ii + x] << (6 - (x & 3) * 2));
                else if (depth == 1)
                    for (var x = 0; x < nw; x++)
                        nimg[i + (x >> 3)] |= (inj[ii + x] << (7 - (x & 7) * 1));
            }
            cimg = nimg;
            ctype = 3;
            bpp = 1;
        }
        else if (gotAlpha == false && frms.length == 1) { // some next "reduced" frames may contain alpha for blending
            var nimg = new Uint8Array(nw * nh * 3), area = nw * nh;
            for (var i = 0; i < area; i++) {
                var ti = i * 3, qi = i * 4;
                nimg[ti] = cimg[qi];
                nimg[ti + 1] = cimg[qi + 1];
                nimg[ti + 2] = cimg[qi + 2];
            }
            cimg = nimg;
            ctype = 2;
            bpp = 3;
            bpl = 3 * nw;
        }
        frm.img = cimg;
        frm.bpl = bpl;
        frm.bpp = bpp;
    }
    //console.log("colors => palette indices", Date.now()-time);  time = Date.now();
    return { ctype: ctype, depth: depth, plte: plte, frames: frms };
};
UPNG.encode.framize = function (bufs, w, h, alwaysBlend, evenCrd, forbidPrev) {
    /*  DISPOSE
        - 0 : no change
        - 1 : clear to transparent
        - 2 : retstore to content before rendering (previous frame disposed)
        BLEND
        - 0 : replace
        - 1 : blend
    */
    var frms = [];
    for (var j = 0; j < bufs.length; j++) {
        var cimg = new Uint8Array(bufs[j]), cimg32 = new Uint32Array(cimg.buffer);
        var nimg;
        var nx = 0, ny = 0, nw = w, nh = h, blend = alwaysBlend ? 1 : 0;
        if (j != 0) {
            var tlim = (forbidPrev || alwaysBlend || j == 1 || frms[j - 2].dispose != 0) ? 1 : 2, tstp = 0, tarea = 1e9;
            for (var it = 0; it < tlim; it++) {
                var pimg = new Uint8Array(bufs[j - 1 - it]), p32 = new Uint32Array(bufs[j - 1 - it]);
                var mix = w, miy = h, max = -1, may = -1;
                for (var y = 0; y < h; y++)
                    for (var x = 0; x < w; x++) {
                        var i = y * w + x;
                        if (cimg32[i] != p32[i]) {
                            if (x < mix)
                                mix = x;
                            if (x > max)
                                max = x;
                            if (y < miy)
                                miy = y;
                            if (y > may)
                                may = y;
                        }
                    }
                if (max == -1)
                    mix = miy = max = may = 0;
                if (evenCrd) {
                    if ((mix & 1) == 1)
                        mix--;
                    if ((miy & 1) == 1)
                        miy--;
                }
                var sarea = (max - mix + 1) * (may - miy + 1);
                if (sarea < tarea) {
                    tarea = sarea;
                    tstp = it;
                    nx = mix;
                    ny = miy;
                    nw = max - mix + 1;
                    nh = may - miy + 1;
                }
            }
            // alwaysBlend: pokud zjistím, že blendit nelze, nastavím předchozímu snímku dispose=1. Zajistím, aby obsahoval můj obdélník.
            var pimg = new Uint8Array(bufs[j - 1 - tstp]);
            if (tstp == 1)
                frms[j - 1].dispose = 2;
            nimg = new Uint8Array(nw * nh * 4);
            UPNG._copyTile(pimg, w, h, nimg, nw, nh, -nx, -ny, 0);
            blend = UPNG._copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 3) ? 1 : 0;
            if (blend == 1)
                UPNG.encode._prepareDiff(cimg, w, h, nimg, { x: nx, y: ny, width: nw, height: nh });
            else
                UPNG._copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 0);
            //UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, blend==1?2:0);
        }
        else
            nimg = cimg.slice(0); // img may be rewritten further ... don't rewrite input
        frms.push({ rect: { x: nx, y: ny, width: nw, height: nh }, img: nimg, blend: blend, dispose: 0 });
    }
    if (alwaysBlend)
        for (var j = 0; j < frms.length; j++) {
            var frm = frms[j];
            if (frm.blend == 1)
                continue;
            var r0 = frm.rect, r1 = frms[j - 1].rect;
            var miX = Math.min(r0.x, r1.x), miY = Math.min(r0.y, r1.y);
            var maX = Math.max(r0.x + r0.width, r1.x + r1.width), maY = Math.max(r0.y + r0.height, r1.y + r1.height);
            var r = { x: miX, y: miY, width: maX - miX, height: maY - miY };
            frms[j - 1].dispose = 1;
            if (j - 1 != 0)
                UPNG.encode._updateFrame(bufs, w, h, frms, j - 1, r, evenCrd);
            UPNG.encode._updateFrame(bufs, w, h, frms, j, r, evenCrd);
        }
    var area = 0;
    if (bufs.length != 1)
        for (var i = 0; i < frms.length; i++) {
            var frm = frms[i];
            area += frm.rect.width * frm.rect.height;
            //if(i==0 || frm.blend!=1) continue;
            //var ob = new Uint8Array(
            //console.log(frm.blend, frm.dispose, frm.rect);
        }
    //if(area!=0) console.log(area);
    return frms;
};
UPNG.encode._updateFrame = function (bufs, w, h, frms, i, r, evenCrd) {
    var U8 = Uint8Array, U32 = Uint32Array;
    var pimg = new U8(bufs[i - 1]), pimg32 = new U32(bufs[i - 1]), nimg = i + 1 < bufs.length ? new U8(bufs[i + 1]) : null;
    var cimg = new U8(bufs[i]), cimg32 = new U32(cimg.buffer);
    var mix = w, miy = h, max = -1, may = -1;
    for (var y = 0; y < r.height; y++)
        for (var x = 0; x < r.width; x++) {
            var cx = r.x + x, cy = r.y + y;
            var j = cy * w + cx, cc = cimg32[j];
            // no need to draw transparency, or to dispose it. Or, if writing the same color and the next one does not need transparency.
            if (cc == 0 || (frms[i - 1].dispose == 0 && pimg32[j] == cc && (nimg == null || nimg[j * 4 + 3] != 0)) /**/) { }
            else {
                if (cx < mix)
                    mix = cx;
                if (cx > max)
                    max = cx;
                if (cy < miy)
                    miy = cy;
                if (cy > may)
                    may = cy;
            }
        }
    if (max == -1)
        mix = miy = max = may = 0;
    if (evenCrd) {
        if ((mix & 1) == 1)
            mix--;
        if ((miy & 1) == 1)
            miy--;
    }
    r = { x: mix, y: miy, width: max - mix + 1, height: may - miy + 1 };
    var fr = frms[i];
    fr.rect = r;
    fr.blend = 1;
    fr.img = new Uint8Array(r.width * r.height * 4);
    if (frms[i - 1].dispose == 0) {
        UPNG._copyTile(pimg, w, h, fr.img, r.width, r.height, -r.x, -r.y, 0);
        UPNG.encode._prepareDiff(cimg, w, h, fr.img, r);
        //UPNG._copyTile(cimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 2);
    }
    else
        UPNG._copyTile(cimg, w, h, fr.img, r.width, r.height, -r.x, -r.y, 0);
};
UPNG.encode._prepareDiff = function (cimg, w, h, nimg, rec) {
    UPNG._copyTile(cimg, w, h, nimg, rec.width, rec.height, -rec.x, -rec.y, 2);
    /*
    var n32 = new Uint32Array(nimg.buffer);
    var og = new Uint8Array(rec.width*rec.height*4), o32 = new Uint32Array(og.buffer);
    UPNG._copyTile(cimg,w,h, og,rec.width,rec.height, -rec.x,-rec.y, 0);
    for(var i=4; i<nimg.length; i+=4) {
        if(nimg[i-1]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)-1]) {
            n32[i>>>2]=o32[i>>>2];
            //var j = i, c=p32[(i>>>2)-1];
            //while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
        }
    }
    for(var i=nimg.length-8; i>0; i-=4) {
        if(nimg[i+7]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)+1]) {
            n32[i>>>2]=o32[i>>>2];
            //var j = i, c=p32[(i>>>2)-1];
            //while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
        }
    }*/
};
UPNG.encode._filterZero = function (img, h, bpp, bpl, data, filter, levelZero) {
    var fls = [], ftry = [0, 1, 2, 3, 4];
    if (filter != -1)
        ftry = [filter];
    else if (h * bpl > 500000 || bpp == 1)
        ftry = [0];
    var opts;
    if (levelZero)
        opts = { level: 0 };
    var CMPR = (levelZero && UZIP != null) ? UZIP : pako;
    for (var i = 0; i < ftry.length; i++) {
        for (var y = 0; y < h; y++)
            UPNG.encode._filterLine(data, img, y, bpl, bpp, ftry[i]);
        //var nimg = new Uint8Array(data.length);
        //var sz = UZIP.F.deflate(data, nimg);  fls.push(nimg.slice(0,sz));
        //var dfl = pako["deflate"](data), dl=dfl.length-4;
        //var crc = (dfl[dl+3]<<24)|(dfl[dl+2]<<16)|(dfl[dl+1]<<8)|(dfl[dl+0]<<0);
        //console.log(crc, UZIP.adler(data,2,data.length-6));
        fls.push(CMPR["deflate"](data, opts));
    }
    var ti, tsize = 1e9;
    for (var i = 0; i < fls.length; i++)
        if (fls[i].length < tsize) {
            ti = i;
            tsize = fls[i].length;
        }
    return fls[ti];
};
UPNG.encode._filterLine = function (data, img, y, bpl, bpp, type) {
    var i = y * bpl, di = i + y, paeth = UPNG.decode._paeth;
    data[di] = type;
    di++;
    if (type == 0) {
        if (bpl < 500)
            for (var x = 0; x < bpl; x++)
                data[di + x] = img[i + x];
        else
            data.set(new Uint8Array(img.buffer, i, bpl), di);
    }
    else if (type == 1) {
        for (var x = 0; x < bpp; x++)
            data[di + x] = img[i + x];
        for (var x = bpp; x < bpl; x++)
            data[di + x] = (img[i + x] - img[i + x - bpp] + 256) & 255;
    }
    else if (y == 0) {
        for (var x = 0; x < bpp; x++)
            data[di + x] = img[i + x];
        if (type == 2)
            for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x];
        if (type == 3)
            for (var x = bpp; x < bpl; x++)
                data[di + x] = (img[i + x] - (img[i + x - bpp] >> 1) + 256) & 255;
        if (type == 4)
            for (var x = bpp; x < bpl; x++)
                data[di + x] = (img[i + x] - paeth(img[i + x - bpp], 0, 0) + 256) & 255;
    }
    else {
        if (type == 2) {
            for (var x = 0; x < bpl; x++)
                data[di + x] = (img[i + x] + 256 - img[i + x - bpl]) & 255;
        }
        if (type == 3) {
            for (var x = 0; x < bpp; x++)
                data[di + x] = (img[i + x] + 256 - (img[i + x - bpl] >> 1)) & 255;
            for (var x = bpp; x < bpl; x++)
                data[di + x] = (img[i + x] + 256 - ((img[i + x - bpl] + img[i + x - bpp]) >> 1)) & 255;
        }
        if (type == 4) {
            for (var x = 0; x < bpp; x++)
                data[di + x] = (img[i + x] + 256 - paeth(0, img[i + x - bpl], 0)) & 255;
            for (var x = bpp; x < bpl; x++)
                data[di + x] = (img[i + x] + 256 - paeth(img[i + x - bpp], img[i + x - bpl], img[i + x - bpp - bpl])) & 255;
        }
    }
};
UPNG.crc = {
    table: (function () {
        var tab = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) {
                if (c & 1)
                    c = 0xedb88320 ^ (c >>> 1);
                else
                    c = c >>> 1;
            }
            tab[n] = c;
        }
        return tab;
    })(),
    update: function (c, buf, off, len) {
        for (var i = 0; i < len; i++)
            c = UPNG.crc.table[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
        return c;
    },
    crc: function (b, o, l) { return UPNG.crc.update(0xffffffff, b, o, l) ^ 0xffffffff; }
};
UPNG.quantize = function (abuf, ps) {
    var oimg = new Uint8Array(abuf), nimg = oimg.slice(0), nimg32 = new Uint32Array(nimg.buffer);
    var KD = UPNG.quantize.getKDtree(nimg, ps);
    var root = KD[0], leafs = KD[1];
    var planeDst = UPNG.quantize.planeDst;
    var sb = oimg, tb = nimg32, len = sb.length;
    var inds = new Uint8Array(oimg.length >> 2);
    for (var i = 0; i < len; i += 4) {
        var r = sb[i] * (1 / 255), g = sb[i + 1] * (1 / 255), b = sb[i + 2] * (1 / 255), a = sb[i + 3] * (1 / 255);
        //  exact, but too slow :(
        var nd = UPNG.quantize.getNearest(root, r, g, b, a);
        //var nd = root;
        //while(nd.left) nd = (planeDst(nd.est,r,g,b,a)<=0) ? nd.left : nd.right;
        inds[i >> 2] = nd.ind;
        tb[i >> 2] = nd.est.rgba;
    }
    return { abuf: nimg.buffer, inds: inds, plte: leafs };
};
UPNG.quantize.getKDtree = function (nimg, ps, err) {
    if (err == null)
        err = 0.0001;
    var nimg32 = new Uint32Array(nimg.buffer);
    var root = { i0: 0, i1: nimg.length, bst: null, est: null, tdst: 0, left: null, right: null }; // basic statistic, extra statistic
    root.bst = UPNG.quantize.stats(nimg, root.i0, root.i1);
    root.est = UPNG.quantize.estats(root.bst);
    var leafs = [root];
    while (leafs.length < ps) {
        var maxL = 0, mi = 0;
        for (var i = 0; i < leafs.length; i++)
            if (leafs[i].est.L > maxL) {
                maxL = leafs[i].est.L;
                mi = i;
            }
        if (maxL < err)
            break;
        var node = leafs[mi];
        var s0 = UPNG.quantize.splitPixels(nimg, nimg32, node.i0, node.i1, node.est.e, node.est.eMq255);
        var s0wrong = (node.i0 >= s0 || node.i1 <= s0);
        //console.log(maxL, leafs.length, mi);
        if (s0wrong) {
            node.est.L = 0;
            continue;
        }
        var ln = { i0: node.i0, i1: s0, bst: null, est: null, tdst: 0, left: null, right: null };
        ln.bst = UPNG.quantize.stats(nimg, ln.i0, ln.i1);
        ln.est = UPNG.quantize.estats(ln.bst);
        var rn = { i0: s0, i1: node.i1, bst: null, est: null, tdst: 0, left: null, right: null };
        rn.bst = { R: [], m: [], N: node.bst.N - ln.bst.N };
        for (var i = 0; i < 16; i++)
            rn.bst.R[i] = node.bst.R[i] - ln.bst.R[i];
        for (var i = 0; i < 4; i++)
            rn.bst.m[i] = node.bst.m[i] - ln.bst.m[i];
        rn.est = UPNG.quantize.estats(rn.bst);
        node.left = ln;
        node.right = rn;
        leafs[mi] = ln;
        leafs.push(rn);
    }
    leafs.sort(function (a, b) { return b.bst.N - a.bst.N; });
    for (var i = 0; i < leafs.length; i++)
        leafs[i].ind = i;
    return [root, leafs];
};
UPNG.quantize.getNearest = function (nd, r, g, b, a) {
    if (nd.left == null) {
        nd.tdst = UPNG.quantize.dist(nd.est.q, r, g, b, a);
        return nd;
    }
    var planeDst = UPNG.quantize.planeDst(nd.est, r, g, b, a);
    var node0 = nd.left, node1 = nd.right;
    if (planeDst > 0) {
        node0 = nd.right;
        node1 = nd.left;
    }
    var ln = UPNG.quantize.getNearest(node0, r, g, b, a);
    if (ln.tdst <= planeDst * planeDst)
        return ln;
    var rn = UPNG.quantize.getNearest(node1, r, g, b, a);
    return rn.tdst < ln.tdst ? rn : ln;
};
UPNG.quantize.planeDst = function (est, r, g, b, a) { var e = est.e; return e[0] * r + e[1] * g + e[2] * b + e[3] * a - est.eMq; };
UPNG.quantize.dist = function (q, r, g, b, a) { var d0 = r - q[0], d1 = g - q[1], d2 = b - q[2], d3 = a - q[3]; return d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3; };
UPNG.quantize.splitPixels = function (nimg, nimg32, i0, i1, e, eMq) {
    var vecDot = UPNG.quantize.vecDot;
    i1 -= 4;
    var shfs = 0;
    while (i0 < i1) {
        while (vecDot(nimg, i0, e) <= eMq)
            i0 += 4;
        while (vecDot(nimg, i1, e) > eMq)
            i1 -= 4;
        if (i0 >= i1)
            break;
        var t = nimg32[i0 >> 2];
        nimg32[i0 >> 2] = nimg32[i1 >> 2];
        nimg32[i1 >> 2] = t;
        i0 += 4;
        i1 -= 4;
    }
    while (vecDot(nimg, i0, e) > eMq)
        i0 -= 4;
    return i0 + 4;
};
UPNG.quantize.vecDot = function (nimg, i, e) {
    return nimg[i] * e[0] + nimg[i + 1] * e[1] + nimg[i + 2] * e[2] + nimg[i + 3] * e[3];
};
UPNG.quantize.stats = function (nimg, i0, i1) {
    var R = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var m = [0, 0, 0, 0];
    var N = (i1 - i0) >> 2;
    for (var i = i0; i < i1; i += 4) {
        var r = nimg[i] * (1 / 255), g = nimg[i + 1] * (1 / 255), b = nimg[i + 2] * (1 / 255), a = nimg[i + 3] * (1 / 255);
        //var r = nimg[i], g = nimg[i+1], b = nimg[i+2], a = nimg[i+3];
        m[0] += r;
        m[1] += g;
        m[2] += b;
        m[3] += a;
        R[0] += r * r;
        R[1] += r * g;
        R[2] += r * b;
        R[3] += r * a;
        R[5] += g * g;
        R[6] += g * b;
        R[7] += g * a;
        R[10] += b * b;
        R[11] += b * a;
        R[15] += a * a;
    }
    R[4] = R[1];
    R[8] = R[2];
    R[9] = R[6];
    R[12] = R[3];
    R[13] = R[7];
    R[14] = R[11];
    return { R: R, m: m, N: N };
};
UPNG.quantize.estats = function (stats) {
    var R = stats.R, m = stats.m, N = stats.N;
    // when all samples are equal, but N is large (millions), the Rj can be non-zero ( 0.0003.... - precission error)
    var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], iN = (N == 0 ? 0 : 1 / N);
    var Rj = [
        R[0] - m0 * m0 * iN, R[1] - m0 * m1 * iN, R[2] - m0 * m2 * iN, R[3] - m0 * m3 * iN,
        R[4] - m1 * m0 * iN, R[5] - m1 * m1 * iN, R[6] - m1 * m2 * iN, R[7] - m1 * m3 * iN,
        R[8] - m2 * m0 * iN, R[9] - m2 * m1 * iN, R[10] - m2 * m2 * iN, R[11] - m2 * m3 * iN,
        R[12] - m3 * m0 * iN, R[13] - m3 * m1 * iN, R[14] - m3 * m2 * iN, R[15] - m3 * m3 * iN
    ];
    var A = Rj, M = UPNG.M4;
    var b = [0.5, 0.5, 0.5, 0.5], mi = 0, tmi = 0;
    if (N != 0)
        for (var i = 0; i < 16; i++) {
            b = M.multVec(A, b);
            tmi = Math.sqrt(M.dot(b, b));
            b = M.sml(1 / tmi, b);
            if (i != 0 && Math.abs(tmi - mi) < 1e-9)
                break;
            mi = tmi;
        }
    //b = [0,0,1,0];  mi=N;
    var q = [m0 * iN, m1 * iN, m2 * iN, m3 * iN];
    var eMq255 = M.dot(M.sml(255, q), b);
    return { Cov: Rj, q: q, e: b, L: mi, eMq255: eMq255, eMq: M.dot(b, q),
        rgba: (((Math.round(255 * q[3]) << 24) | (Math.round(255 * q[2]) << 16) | (Math.round(255 * q[1]) << 8) | (Math.round(255 * q[0]) << 0)) >>> 0) };
};
UPNG.M4 = {
    multVec: function (m, v) {
        return [
            m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3] * v[3],
            m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7] * v[3],
            m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11] * v[3],
            m[12] * v[0] + m[13] * v[1] + m[14] * v[2] + m[15] * v[3]
        ];
    },
    dot: function (x, y) { return x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3]; },
    sml: function (a, y) { return [a * y[0], a * y[1], a * y[2], a * y[3]]; }
};
UPNG.encode.concatRGBA = function (bufs) {
    var tlen = 0;
    for (var i = 0; i < bufs.length; i++)
        tlen += bufs[i].byteLength;
    var nimg = new Uint8Array(tlen), noff = 0;
    for (var i = 0; i < bufs.length; i++) {
        var img = new Uint8Array(bufs[i]), il = img.length;
        for (var j = 0; j < il; j += 4) {
            var r = img[j], g = img[j + 1], b = img[j + 2], a = img[j + 3];
            if (a == 0)
                r = g = b = 0;
            nimg[noff + j] = r;
            nimg[noff + j + 1] = g;
            nimg[noff + j + 2] = b;
            nimg[noff + j + 3] = a;
        }
        noff += il;
    }
    return nimg.buffer;
};
/**
  A javascript Bezier curve library by Pomax.
  Based on http://pomax.github.io/bezierinfo
  This code is MIT licensed.
**/
var Bezier = function (t) { function r(i) { if (n[i])
    return n[i].exports; var e = n[i] = { exports: {}, id: i, loaded: !1 }; return t[i].call(e.exports, e, e.exports, r), e.loaded = !0, e.exports; } var n = {}; return r.m = t, r.c = n, r.p = "", r(0); }([function (t, r, n) {
        "use strict";
        t.exports = n(1);
    }, function (t, r, n) {
        "use strict";
        var i = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t; } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol ? "symbol" : typeof t; };
        !function () { function r(t, r, n, i, e) { "undefined" == typeof e && (e = .5); var o = l.projectionratio(e, t), s = 1 - o, u = { x: o * r.x + s * i.x, y: o * r.y + s * i.y }, a = l.abcratio(e, t), f = { x: n.x + (n.x - u.x) / a, y: n.y + (n.y - u.y) / a }; return { A: f, B: n, C: u }; } var e = Math.abs, o = Math.min, s = Math.max, u = Math.cos, a = Math.sin, f = Math.acos, c = Math.sqrt, h = Math.PI, x = { x: 0, y: 0, z: 0 }, l = n(2), y = n(3), p = function (t) { var r = t && t.forEach ? t : [].slice.call(arguments), n = !1; if ("object" === i(r[0])) {
            n = r.length;
            var o = [];
            r.forEach(function (t) { ["x", "y", "z"].forEach(function (r) { "undefined" != typeof t[r] && o.push(t[r]); }); }), r = o;
        } var s = !1, u = r.length; if (n) {
            if (n > 4) {
                if (1 !== arguments.length)
                    throw new Error("Only new Bezier(point[]) is accepted for 4th and higher order curves");
                s = !0;
            }
        }
        else if (6 !== u && 8 !== u && 9 !== u && 12 !== u && 1 !== arguments.length)
            throw new Error("Only new Bezier(point[]) is accepted for 4th and higher order curves"); var a = !s && (9 === u || 12 === u) || t && t[0] && "undefined" != typeof t[0].z; this._3d = a; for (var f = [], c = 0, h = a ? 3 : 2; u > c; c += h) {
            var x = { x: r[c], y: r[c + 1] };
            a && (x.z = r[c + 2]), f.push(x);
        } this.order = f.length - 1, this.points = f; var y = ["x", "y"]; a && y.push("z"), this.dims = y, this.dimlen = y.length, function (t) { for (var r = t.order, n = t.points, i = l.align(n, { p1: n[0], p2: n[r] }), o = 0; o < i.length; o++)
            if (e(i[o].y) > 1e-4)
                return void (t._linear = !1); t._linear = !0; }(this), this._t1 = 0, this._t2 = 1, this.update(); }, v = n(4); p.SVGtoBeziers = function (t) { return v(p, t); }, p.quadraticFromPoints = function (t, n, i, e) { if ("undefined" == typeof e && (e = .5), 0 === e)
            return new p(n, n, i); if (1 === e)
            return new p(t, n, n); var o = r(2, t, n, i, e); return new p(t, o.A, i); }, p.cubicFromPoints = function (t, n, i, e, o) { "undefined" == typeof e && (e = .5); var s = r(3, t, n, i, e); "undefined" == typeof o && (o = l.dist(n, s.C)); var u = o * (1 - e) / e, a = l.dist(t, i), f = (i.x - t.x) / a, c = (i.y - t.y) / a, h = o * f, x = o * c, y = u * f, v = u * c, d = { x: n.x - h, y: n.y - x }, m = { x: n.x + y, y: n.y + v }, g = s.A, z = { x: g.x + (d.x - g.x) / (1 - e), y: g.y + (d.y - g.y) / (1 - e) }, b = { x: g.x + (m.x - g.x) / e, y: g.y + (m.y - g.y) / e }, _ = { x: t.x + (z.x - t.x) / e, y: t.y + (z.y - t.y) / e }, w = { x: i.x + (b.x - i.x) / (1 - e), y: i.y + (b.y - i.y) / (1 - e) }; return new p(t, _, w, i); }; var d = function () { return l; }; p.getUtils = d, p.PolyBezier = y, p.prototype = { getUtils: d, valueOf: function () { return this.toString(); }, toString: function () { return l.pointsToString(this.points); }, toSVG: function (t) { if (this._3d)
                return !1; for (var r = this.points, n = r[0].x, i = r[0].y, e = ["M", n, i, 2 === this.order ? "Q" : "C"], o = 1, s = r.length; s > o; o++)
                e.push(r[o].x), e.push(r[o].y); return e.join(" "); }, update: function () { this._lut = [], this.dpoints = l.derive(this.points, this._3d), this.computedirection(); }, computedirection: function () { var t = this.points, r = l.angle(t[0], t[this.order], t[1]); this.clockwise = r > 0; }, length: function () { return l.length(this.derivative.bind(this)); }, _lut: [], getLUT: function (t) { if (t = t || 100, this._lut.length === t)
                return this._lut; this._lut = [], t--; for (var r = 0; t >= r; r++)
                this._lut.push(this.compute(r / t)); return this._lut; }, on: function (t, r) { r = r || 5; for (var n, i = this.getLUT(), e = [], o = 0, s = 0; s < i.length; s++)
                n = i[s], l.dist(n, t) < r && (e.push(n), o += s / i.length); return e.length ? o /= e.length : !1; }, project: function (t) { var r = this.getLUT(), n = r.length - 1, i = l.closest(r, t), e = i.mdist, o = i.mpos; if (0 === o || o === n) {
                var s = o / n, u = this.compute(s);
                return u.t = s, u.d = e, u;
            } var a, s, f, c, h = (o - 1) / n, x = (o + 1) / n, y = .1 / n; for (e += 1, s = h, a = s; x + y > s; s += y)
                f = this.compute(s), c = l.dist(t, f), e > c && (e = c, a = s); return f = this.compute(a), f.t = a, f.d = e, f; }, get: function (t) { return this.compute(t); }, point: function (t) { return this.points[t]; }, compute: function (t) { return l.compute(t, this.points, this._3d); }, raise: function () { for (var t, r, n, i = this.points, e = [i[0]], o = i.length, t = 1; o > t; t++)
                r = i[t], n = i[t - 1], e[t] = { x: (o - t) / o * r.x + t / o * n.x, y: (o - t) / o * r.y + t / o * n.y }; return e[o] = i[o - 1], new p(e); }, derivative: function (t) { var r, n, i = 1 - t, e = 0, o = this.dpoints[0]; 2 === this.order && (o = [o[0], o[1], x], r = i, n = t), 3 === this.order && (r = i * i, n = i * t * 2, e = t * t); var s = { x: r * o[0].x + n * o[1].x + e * o[2].x, y: r * o[0].y + n * o[1].y + e * o[2].y }; return this._3d && (s.z = r * o[0].z + n * o[1].z + e * o[2].z), s; }, curvature: function (t) { return l.curvature(t, this.points, this._3d); }, inflections: function () { return l.inflections(this.points); }, normal: function (t) { return this._3d ? this.__normal3(t) : this.__normal2(t); }, __normal2: function (t) { var r = this.derivative(t), n = c(r.x * r.x + r.y * r.y); return { x: -r.y / n, y: r.x / n }; }, __normal3: function (t) { var r = this.derivative(t), n = this.derivative(t + .01), i = c(r.x * r.x + r.y * r.y + r.z * r.z), e = c(n.x * n.x + n.y * n.y + n.z * n.z); r.x /= i, r.y /= i, r.z /= i, n.x /= e, n.y /= e, n.z /= e; var o = { x: n.y * r.z - n.z * r.y, y: n.z * r.x - n.x * r.z, z: n.x * r.y - n.y * r.x }, s = c(o.x * o.x + o.y * o.y + o.z * o.z); o.x /= s, o.y /= s, o.z /= s; var u = [o.x * o.x, o.x * o.y - o.z, o.x * o.z + o.y, o.x * o.y + o.z, o.y * o.y, o.y * o.z - o.x, o.x * o.z - o.y, o.y * o.z + o.x, o.z * o.z], a = { x: u[0] * r.x + u[1] * r.y + u[2] * r.z, y: u[3] * r.x + u[4] * r.y + u[5] * r.z, z: u[6] * r.x + u[7] * r.y + u[8] * r.z }; return a; }, hull: function (t) { var r, n = this.points, i = [], e = [], o = 0, s = 0, u = 0; for (e[o++] = n[0], e[o++] = n[1], e[o++] = n[2], 3 === this.order && (e[o++] = n[3]); n.length > 1;) {
                for (i = [], s = 0, u = n.length - 1; u > s; s++)
                    r = l.lerp(t, n[s], n[s + 1]), e[o++] = r, i.push(r);
                n = i;
            } return e; }, split: function (t, r) { if (0 === t && r)
                return this.split(r).left; if (1 === r)
                return this.split(t).right; var n = this.hull(t), i = { left: new p(2 === this.order ? [n[0], n[3], n[5]] : [n[0], n[4], n[7], n[9]]), right: new p(2 === this.order ? [n[5], n[4], n[2]] : [n[9], n[8], n[6], n[3]]), span: n }; if (i.left._t1 = l.map(0, 0, 1, this._t1, this._t2), i.left._t2 = l.map(t, 0, 1, this._t1, this._t2), i.right._t1 = l.map(t, 0, 1, this._t1, this._t2), i.right._t2 = l.map(1, 0, 1, this._t1, this._t2), !r)
                return i; r = l.map(r, t, 1, 0, 1); var e = i.right.split(r); return e.left; }, extrema: function () { var t, r, n = this.dims, i = {}, e = []; return n.forEach(function (n) { r = function (t) { return t[n]; }, t = this.dpoints[0].map(r), i[n] = l.droots(t), 3 === this.order && (t = this.dpoints[1].map(r), i[n] = i[n].concat(l.droots(t))), i[n] = i[n].filter(function (t) { return t >= 0 && 1 >= t; }), e = e.concat(i[n].sort(l.numberSort)); }.bind(this)), e = e.sort(l.numberSort).filter(function (t, r) { return e.indexOf(t) === r; }), i.values = e, i; }, bbox: function () { var t = this.extrema(), r = {}; return this.dims.forEach(function (n) { r[n] = l.getminmax(this, n, t[n]); }.bind(this)), r; }, overlaps: function (t) { var r = this.bbox(), n = t.bbox(); return l.bboxoverlap(r, n); }, offset: function (t, r) { if ("undefined" != typeof r) {
                var n = this.get(t), i = this.normal(t), e = { c: n, n: i, x: n.x + i.x * r, y: n.y + i.y * r };
                return this._3d && (e.z = n.z + i.z * r), e;
            } if (this._linear) {
                var o = this.normal(0), s = this.points.map(function (r) { var n = { x: r.x + t * o.x, y: r.y + t * o.y }; return r.z && i.z && (n.z = r.z + t * o.z), n; });
                return [new p(s)];
            } var u = this.reduce(); return u.map(function (r) { return r.scale(t); }); }, simple: function () { if (3 === this.order) {
                var t = l.angle(this.points[0], this.points[3], this.points[1]), r = l.angle(this.points[0], this.points[3], this.points[2]);
                if (t > 0 && 0 > r || 0 > t && r > 0)
                    return !1;
            } var n = this.normal(0), i = this.normal(1), o = n.x * i.x + n.y * i.y; this._3d && (o += n.z * i.z); var s = e(f(o)); return h / 3 > s; }, reduce: function () { var t, r, n = 0, i = 0, o = .01, s = [], u = [], a = this.extrema().values; for (-1 === a.indexOf(0) && (a = [0].concat(a)), -1 === a.indexOf(1) && a.push(1), n = a[0], t = 1; t < a.length; t++)
                i = a[t], r = this.split(n, i), r._t1 = n, r._t2 = i, s.push(r), n = i; return s.forEach(function (t) { for (n = 0, i = 0; 1 >= i;)
                for (i = n + o; 1 + o >= i; i += o)
                    if (r = t.split(n, i), !r.simple()) {
                        if (i -= o, e(n - i) < o)
                            return [];
                        r = t.split(n, i), r._t1 = l.map(n, 0, 1, t._t1, t._t2), r._t2 = l.map(i, 0, 1, t._t1, t._t2), u.push(r), n = i;
                        break;
                    } 1 > n && (r = t.split(n, 1), r._t1 = l.map(n, 0, 1, t._t1, t._t2), r._t2 = t._t2, u.push(r)); }), u; }, scale: function (t) { var r = this.order, n = !1; if ("function" == typeof t && (n = t), n && 2 === r)
                return this.raise().scale(n); var i = this.clockwise, e = n ? n(0) : t, o = n ? n(1) : t, s = [this.offset(0, 10), this.offset(1, 10)], u = l.lli4(s[0], s[0].c, s[1], s[1].c); if (!u)
                throw new Error("cannot scale this curve. Try reducing it first."); var a = this.points, f = []; return [0, 1].forEach(function (t) { var n = f[t * r] = l.copy(a[t * r]); n.x += (t ? o : e) * s[t].n.x, n.y += (t ? o : e) * s[t].n.y; }.bind(this)), n ? ([0, 1].forEach(function (e) { if (2 !== this.order || !e) {
                var o = a[e + 1], s = { x: o.x - u.x, y: o.y - u.y }, h = n ? n((e + 1) / r) : t;
                n && !i && (h = -h);
                var x = c(s.x * s.x + s.y * s.y);
                s.x /= x, s.y /= x, f[e + 1] = { x: o.x + h * s.x, y: o.y + h * s.y };
            } }.bind(this)), new p(f)) : ([0, 1].forEach(function (t) { if (2 !== this.order || !t) {
                var n = f[t * r], i = this.derivative(t), e = { x: n.x + i.x, y: n.y + i.y };
                f[t + 1] = l.lli4(n, e, u, a[t + 1]);
            } }.bind(this)), new p(f)); }, outline: function (t, r, n, i) { function e(t, r, n, i, e) { return function (o) { var s = i / n, u = (i + e) / n, a = r - t; return l.map(o, 0, 1, t + s * a, t + u * a); }; } r = "undefined" == typeof r ? t : r; var o, s = this.reduce(), u = s.length, a = [], f = [], c = 0, h = this.length(), x = "undefined" != typeof n && "undefined" != typeof i; s.forEach(function (o) { _ = o.length(), x ? (a.push(o.scale(e(t, n, h, c, _))), f.push(o.scale(e(-r, -i, h, c, _)))) : (a.push(o.scale(t)), f.push(o.scale(-r))), c += _; }), f = f.map(function (t) { return o = t.points, o[3] ? t.points = [o[3], o[2], o[1], o[0]] : t.points = [o[2], o[1], o[0]], t; }).reverse(); var p = a[0].points[0], v = a[u - 1].points[a[u - 1].points.length - 1], d = f[u - 1].points[f[u - 1].points.length - 1], m = f[0].points[0], g = l.makeline(d, p), z = l.makeline(v, m), b = [g].concat(a).concat([z]).concat(f), _ = b.length; return new y(b); }, outlineshapes: function (t, r, n) { r = r || t; for (var i = this.outline(t, r).curves, e = [], o = 1, s = i.length; s / 2 > o; o++) {
                var u = l.makeshape(i[o], i[s - o], n);
                u.startcap.virtual = o > 1, u.endcap.virtual = s / 2 - 1 > o, e.push(u);
            } return e; }, intersects: function (t, r) { return t ? t.p1 && t.p2 ? this.lineIntersects(t) : (t instanceof p && (t = t.reduce()), this.curveintersects(this.reduce(), t, r)) : this.selfintersects(r); }, lineIntersects: function (t) { var r = o(t.p1.x, t.p2.x), n = o(t.p1.y, t.p2.y), i = s(t.p1.x, t.p2.x), e = s(t.p1.y, t.p2.y), u = this; return l.roots(this.points, t).filter(function (t) { var o = u.get(t); return l.between(o.x, r, i) && l.between(o.y, n, e); }); }, selfintersects: function (t) { var r, n, i, e, o = this.reduce(), s = o.length - 2, u = []; for (r = 0; s > r; r++)
                i = o.slice(r, r + 1), e = o.slice(r + 2), n = this.curveintersects(i, e, t), u = u.concat(n); return u; }, curveintersects: function (t, r, n) { var i = []; t.forEach(function (t) { r.forEach(function (r) { t.overlaps(r) && i.push({ left: t, right: r }); }); }); var e = []; return i.forEach(function (t) { var r = l.pairiteration(t.left, t.right, n); r.length > 0 && (e = e.concat(r)); }), e; }, arcs: function (t) { t = t || .5; var r = []; return this._iterate(t, r); }, _error: function (t, r, n, i) { var o = (i - n) / 4, s = this.get(n + o), u = this.get(i - o), a = l.dist(t, r), f = l.dist(t, s), c = l.dist(t, u); return e(f - a) + e(c - a); }, _iterate: function (t, r) { var n, i = 0, e = 1; do {
                n = 0, e = 1;
                var o, s, f, c, h, x = this.get(i), y = !1, p = !1, v = e, d = 1, m = 0;
                do {
                    p = y, c = f, v = (i + e) / 2, m++, o = this.get(v), s = this.get(e), f = l.getccenter(x, o, s), f.interval = { start: i, end: e };
                    var g = this._error(f, x, i, e);
                    if (y = t >= g, h = p && !y, h || (d = e), y) {
                        if (e >= 1) {
                            if (f.interval.end = d = 1, c = f, e > 1) {
                                var z = { x: f.x + f.r * u(f.e), y: f.y + f.r * a(f.e) };
                                f.e += l.angle({ x: f.x, y: f.y }, z, this.get(1));
                            }
                            break;
                        }
                        e += (e - i) / 2;
                    }
                    else
                        e = v;
                } while (!h && n++ < 100);
                if (n >= 100)
                    break;
                c = c ? c : f, r.push(c), i = d;
            } while (1 > e); return r; } }, t.exports = p; }();
    }, function (t, r, n) {
        "use strict";
        !function () { var r = Math.abs, i = Math.cos, e = Math.sin, o = Math.acos, s = Math.atan2, u = Math.sqrt, a = Math.pow, f = function (t) { return 0 > t ? -a(-t, 1 / 3) : a(t, 1 / 3); }, c = Math.PI, h = 2 * c, x = c / 2, l = 1e-6, y = Number.MAX_SAFE_INTEGER || 9007199254740991, p = Number.MIN_SAFE_INTEGER || -9007199254740991, v = { x: 0, y: 0, z: 0 }, d = { Tvalues: [-.06405689286260563, .06405689286260563, -.1911188674736163, .1911188674736163, -.3150426796961634, .3150426796961634, -.4337935076260451, .4337935076260451, -.5454214713888396, .5454214713888396, -.6480936519369755, .6480936519369755, -.7401241915785544, .7401241915785544, -.820001985973903, .820001985973903, -.8864155270044011, .8864155270044011, -.9382745520027328, .9382745520027328, -.9747285559713095, .9747285559713095, -.9951872199970213, .9951872199970213], Cvalues: [.12793819534675216, .12793819534675216, .1258374563468283, .1258374563468283, .12167047292780339, .12167047292780339, .1155056680537256, .1155056680537256, .10744427011596563, .10744427011596563, .09761865210411388, .09761865210411388, .08619016153195327, .08619016153195327, .0733464814110803, .0733464814110803, .05929858491543678, .05929858491543678, .04427743881741981, .04427743881741981, .028531388628933663, .028531388628933663, .0123412297999872, .0123412297999872], arcfn: function (t, r) { var n = r(t), i = n.x * n.x + n.y * n.y; return "undefined" != typeof n.z && (i += n.z * n.z), u(i); }, compute: function (t, r, n) { if (0 === t)
                return r[0]; var i = r.length - 1; if (1 === t)
                return r[i]; var e = r, o = 1 - t; if (0 === i)
                return r[0]; if (1 === i)
                return x = { x: o * e[0].x + t * e[1].x, y: o * e[0].y + t * e[1].y }, n && (x.z = o * e[0].z + t * e[1].z), x; if (4 > i) {
                var s, u, a, f = o * o, c = t * t, h = 0;
                2 === i ? (e = [e[0], e[1], e[2], v], s = f, u = o * t * 2, a = c) : 3 === i && (s = f * o, u = f * t * 3, a = o * c * 3, h = t * c);
                var x = { x: s * e[0].x + u * e[1].x + a * e[2].x + h * e[3].x, y: s * e[0].y + u * e[1].y + a * e[2].y + h * e[3].y };
                return n && (x.z = s * e[0].z + u * e[1].z + a * e[2].z + h * e[3].z), x;
            } for (var l = JSON.parse(JSON.stringify(r)); l.length > 1;) {
                for (var y = 0; y < l.length - 1; y++)
                    l[y] = { x: l[y].x + (l[y + 1].x - l[y].x) * t, y: l[y].y + (l[y + 1].y - l[y].y) * t }, "undefined" != typeof l[y].z && (l[y] = l[y].z + (l[y + 1].z - l[y].z) * t);
                l.splice(l.length - 1, 1);
            } return l[0]; }, derive: function (t, r) { for (var n = [], i = t, e = i.length, o = e - 1; e > 1; e--, o--) {
                for (var s, u = [], a = 0; o > a; a++)
                    s = { x: o * (i[a + 1].x - i[a].x), y: o * (i[a + 1].y - i[a].y) }, r && (s.z = o * (i[a + 1].z - i[a].z)), u.push(s);
                n.push(u), i = u;
            } return n; }, between: function (t, r, n) { return t >= r && n >= t || d.approximately(t, r) || d.approximately(t, n); }, approximately: function (t, n, i) { return r(t - n) <= (i || l); }, length: function (t) { var r, n, i = .5, e = 0, o = d.Tvalues.length; for (r = 0; o > r; r++)
                n = i * d.Tvalues[r] + i, e += d.Cvalues[r] * d.arcfn(n, t); return i * e; }, map: function (t, r, n, i, e) { var o = n - r, s = e - i, u = t - r, a = u / o; return i + s * a; }, lerp: function (t, r, n) { var i = { x: r.x + t * (n.x - r.x), y: r.y + t * (n.y - r.y) }; return r.z && n.z && (i.z = r.z + t * (n.z - r.z)), i; }, pointToString: function (t) { var r = t.x + "/" + t.y; return "undefined" != typeof t.z && (r += "/" + t.z), r; }, pointsToString: function (t) { return "[" + t.map(d.pointToString).join(", ") + "]"; }, copy: function (t) { return JSON.parse(JSON.stringify(t)); }, angle: function (t, r, n) { var i = r.x - t.x, e = r.y - t.y, o = n.x - t.x, u = n.y - t.y, a = i * u - e * o, f = i * o + e * u; return s(a, f); }, round: function (t, r) { var n = "" + t, i = n.indexOf("."); return parseFloat(n.substring(0, i + 1 + r)); }, dist: function (t, r) { var n = t.x - r.x, i = t.y - r.y; return u(n * n + i * i); }, closest: function (t, r) { var n, i, e = a(2, 63); return t.forEach(function (t, o) { i = d.dist(r, t), e > i && (e = i, n = o); }), { mdist: e, mpos: n }; }, abcratio: function (t, n) { if (2 !== n && 3 !== n)
                return !1; if ("undefined" == typeof t)
                t = .5;
            else if (0 === t || 1 === t)
                return t; var i = a(t, n) + a(1 - t, n), e = i - 1; return r(e / i); }, projectionratio: function (t, r) { if (2 !== r && 3 !== r)
                return !1; if ("undefined" == typeof t)
                t = .5;
            else if (0 === t || 1 === t)
                return t; var n = a(1 - t, r), i = a(t, r) + n; return n / i; }, lli8: function (t, r, n, i, e, o, s, u) { var a = (t * i - r * n) * (e - s) - (t - n) * (e * u - o * s), f = (t * i - r * n) * (o - u) - (r - i) * (e * u - o * s), c = (t - n) * (o - u) - (r - i) * (e - s); return 0 == c ? !1 : { x: a / c, y: f / c }; }, lli4: function (t, r, n, i) { var e = t.x, o = t.y, s = r.x, u = r.y, a = n.x, f = n.y, c = i.x, h = i.y; return d.lli8(e, o, s, u, a, f, c, h); }, lli: function (t, r) { return d.lli4(t, t.c, r, r.c); }, makeline: function (t, r) { var i = n(1), e = t.x, o = t.y, s = r.x, u = r.y, a = (s - e) / 3, f = (u - o) / 3; return new i(e, o, e + a, o + f, e + 2 * a, o + 2 * f, s, u); }, findbbox: function (t) { var r = y, n = y, i = p, e = p; return t.forEach(function (t) { var o = t.bbox(); r > o.x.min && (r = o.x.min), n > o.y.min && (n = o.y.min), i < o.x.max && (i = o.x.max), e < o.y.max && (e = o.y.max); }), { x: { min: r, mid: (r + i) / 2, max: i, size: i - r }, y: { min: n, mid: (n + e) / 2, max: e, size: e - n } }; }, shapeintersections: function (t, r, n, i, e) { if (!d.bboxoverlap(r, i))
                return []; var o = [], s = [t.startcap, t.forward, t.back, t.endcap], u = [n.startcap, n.forward, n.back, n.endcap]; return s.forEach(function (r) { r.virtual || u.forEach(function (i) { if (!i.virtual) {
                var s = r.intersects(i, e);
                s.length > 0 && (s.c1 = r, s.c2 = i, s.s1 = t, s.s2 = n, o.push(s));
            } }); }), o; }, makeshape: function (t, r, n) { var i = r.points.length, e = t.points.length, o = d.makeline(r.points[i - 1], t.points[0]), s = d.makeline(t.points[e - 1], r.points[0]), u = { startcap: o, forward: t, back: r, endcap: s, bbox: d.findbbox([o, t, r, s]) }, a = d; return u.intersections = function (t) { return a.shapeintersections(u, u.bbox, t, t.bbox, n); }, u; }, getminmax: function (t, r, n) { if (!n)
                return { min: 0, max: 0 }; var i, e, o = y, s = p; -1 === n.indexOf(0) && (n = [0].concat(n)), -1 === n.indexOf(1) && n.push(1); for (var u = 0, a = n.length; a > u; u++)
                i = n[u], e = t.get(i), e[r] < o && (o = e[r]), e[r] > s && (s = e[r]); return { min: o, mid: (o + s) / 2, max: s, size: s - o }; }, align: function (t, r) { var n = r.p1.x, o = r.p1.y, u = -s(r.p2.y - o, r.p2.x - n), a = function (t) { return { x: (t.x - n) * i(u) - (t.y - o) * e(u), y: (t.x - n) * e(u) + (t.y - o) * i(u) }; }; return t.map(a); }, roots: function (t, r) { r = r || { p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 } }; var n = t.length - 1, e = d.align(t, r), s = function (t) { return t >= 0 && 1 >= t; }; if (2 === n) {
                var a = e[0].y, c = e[1].y, x = e[2].y, l = a - 2 * c + x;
                if (0 !== l) {
                    var y = -u(c * c - a * x), p = -a + c, v = -(y + p) / l, m = -(-y + p) / l;
                    return [v, m].filter(s);
                }
                return c !== x && 0 === l ? [(2 * c - x) / (2 * c - 2 * x)].filter(s) : [];
            } var g = e[0].y, z = e[1].y, b = e[2].y, _ = e[3].y, l = -g + 3 * z - 3 * b + _, a = 3 * g - 6 * z + 3 * b, c = -3 * g + 3 * z, x = g; if (d.approximately(l, 0)) {
                if (d.approximately(a, 0))
                    return d.approximately(c, 0) ? [] : [-x / c].filter(s);
                var w = u(c * c - 4 * a * x), E = 2 * a;
                return [(w - c) / E, (-c - w) / E].filter(s);
            } a /= l, c /= l, x /= l; var M, v, S, k, j, e = (3 * c - a * a) / 3, O = e / 3, w = (2 * a * a * a - 9 * a * c + 27 * x) / 27, T = w / 2, C = T * T + O * O * O; if (0 > C) {
                var L = -e / 3, N = L * L * L, A = u(N), B = -w / (2 * A), F = -1 > B ? -1 : B > 1 ? 1 : B, I = o(F), q = f(A), P = 2 * q;
                return S = P * i(I / 3) - a / 3, k = P * i((I + h) / 3) - a / 3, j = P * i((I + 2 * h) / 3) - a / 3, [S, k, j].filter(s);
            } if (0 === C)
                return M = 0 > T ? f(-T) : -f(T), S = 2 * M - a / 3, k = -M - a / 3, [S, k].filter(s); var Q = u(C); return M = f(-T + Q), v = f(T + Q), [M - v - a / 3].filter(s); }, droots: function (t) { if (3 === t.length) {
                var r = t[0], n = t[1], i = t[2], e = r - 2 * n + i;
                if (0 !== e) {
                    var o = -u(n * n - r * i), s = -r + n, a = -(o + s) / e, f = -(-o + s) / e;
                    return [a, f];
                }
                return n !== i && 0 === e ? [(2 * n - i) / (2 * (n - i))] : [];
            } if (2 === t.length) {
                var r = t[0], n = t[1];
                return r !== n ? [r / (r - n)] : [];
            } }, curvature: function (t, r, n) { var i, e, o = d.derive(r), s = o[0], f = o[1], c = d.compute(t, s), h = d.compute(t, f); return n ? (i = u(a(c.y * h.z - h.y * c.z, 2) + a(c.z * h.x - h.z * c.x, 2) + a(c.x * h.y - h.x * c.y, 2)), e = a(c.x * c.x + c.y * c.y + c.z * c.z, 1.5)) : (i = c.x * h.y - c.y * h.x, e = a(c.x * c.x + c.y * c.y, 1.5)), 0 === i || 0 === e ? { k: 0, r: 0 } : { k: i / e, r: e / i }; }, inflections: function (t) { if (t.length < 4)
                return []; var r = d.align(t, { p1: t[0], p2: t.slice(-1)[0] }), n = r[2].x * r[1].y, i = r[3].x * r[1].y, e = r[1].x * r[2].y, o = r[3].x * r[2].y, s = 18 * (-3 * n + 2 * i + 3 * e - o), u = 18 * (3 * n - i - 3 * e), a = 18 * (e - n); if (d.approximately(s, 0)) {
                if (!d.approximately(u, 0)) {
                    var f = -a / u;
                    if (f >= 0 && 1 >= f)
                        return [f];
                }
                return [];
            } var c = u * u - 4 * s * a, h = Math.sqrt(c), o = 2 * s; return d.approximately(o, 0) ? [] : [(h - u) / o, -(u + h) / o].filter(function (t) { return t >= 0 && 1 >= t; }); }, bboxoverlap: function (t, n) { var i, e, o, s, u, a = ["x", "y"], f = a.length; for (i = 0; f > i; i++)
                if (e = a[i], o = t[e].mid, s = n[e].mid, u = (t[e].size + n[e].size) / 2, r(o - s) >= u)
                    return !1; return !0; }, expandbox: function (t, r) { r.x.min < t.x.min && (t.x.min = r.x.min), r.y.min < t.y.min && (t.y.min = r.y.min), r.z && r.z.min < t.z.min && (t.z.min = r.z.min), r.x.max > t.x.max && (t.x.max = r.x.max), r.y.max > t.y.max && (t.y.max = r.y.max), r.z && r.z.max > t.z.max && (t.z.max = r.z.max), t.x.mid = (t.x.min + t.x.max) / 2, t.y.mid = (t.y.min + t.y.max) / 2, t.z && (t.z.mid = (t.z.min + t.z.max) / 2), t.x.size = t.x.max - t.x.min, t.y.size = t.y.max - t.y.min, t.z && (t.z.size = t.z.max - t.z.min); }, pairiteration: function (t, r, n) { var i = t.bbox(), e = r.bbox(), o = 1e5, s = n || .5; if (i.x.size + i.y.size < s && e.x.size + e.y.size < s)
                return [(o * (t._t1 + t._t2) / 2 | 0) / o + "/" + (o * (r._t1 + r._t2) / 2 | 0) / o]; var u = t.split(.5), a = r.split(.5), f = [{ left: u.left, right: a.left }, { left: u.left, right: a.right }, { left: u.right, right: a.right }, { left: u.right, right: a.left }]; f = f.filter(function (t) { return d.bboxoverlap(t.left.bbox(), t.right.bbox()); }); var c = []; return 0 === f.length ? c : (f.forEach(function (t) { c = c.concat(d.pairiteration(t.left, t.right, s)); }), c = c.filter(function (t, r) { return c.indexOf(t) === r; })); }, getccenter: function (t, r, n) { var o, u = r.x - t.x, a = r.y - t.y, f = n.x - r.x, c = n.y - r.y, l = u * i(x) - a * e(x), y = u * e(x) + a * i(x), p = f * i(x) - c * e(x), v = f * e(x) + c * i(x), m = (t.x + r.x) / 2, g = (t.y + r.y) / 2, z = (r.x + n.x) / 2, b = (r.y + n.y) / 2, _ = m + l, w = g + y, E = z + p, M = b + v, S = d.lli8(m, g, _, w, z, b, E, M), k = d.dist(S, t), j = s(t.y - S.y, t.x - S.x), O = s(r.y - S.y, r.x - S.x), T = s(n.y - S.y, n.x - S.x); return T > j ? ((j > O || O > T) && (j += h), j > T && (o = T, T = j, j = o)) : O > T && j > O ? (o = T, T = j, j = o) : T += h, S.s = j, S.e = T, S.r = k, S; }, numberSort: function (t, r) { return t - r; } }; t.exports = d; }();
    }, function (t, r, n) {
        "use strict";
        !function () { var r = n(2), i = function (t) { this.curves = [], this._3d = !1, t && (this.curves = t, this._3d = this.curves[0]._3d); }; i.prototype = { valueOf: function () { return this.toString(); }, toString: function () { return "[" + this.curves.map(function (t) { return r.pointsToString(t.points); }).join(", ") + "]"; }, addCurve: function (t) { this.curves.push(t), this._3d = this._3d || t._3d; }, length: function () { return this.curves.map(function (t) { return t.length(); }).reduce(function (t, r) { return t + r; }); }, curve: function (t) { return this.curves[t]; }, bbox: function e() { for (var t = this.curves, e = t[0].bbox(), n = 1; n < t.length; n++)
                r.expandbox(e, t[n].bbox()); return e; }, offset: function o(t) { var o = []; return this.curves.forEach(function (r) { o = o.concat(r.offset(t)); }), new i(o); } }, t.exports = i; }();
    }, function (t, r, n) {
        "use strict";
        function i(t, r, n) { if ("Z" !== r) {
            if ("M" === r)
                return void (s = { x: n[0], y: n[1] });
            var i = [!1, s.x, s.y].concat(n), e = t.bind.apply(t, i), o = new e, u = n.slice(-2);
            return s = { x: u[0], y: u[1] }, o;
        } }
        function e(t, r) { for (var n, e, s, u = o(r).split(" "), a = new RegExp("[MLCQZ]", ""), f = [], c = { C: 6, Q: 4, L: 2, M: 2 }; u.length;)
            n = u.splice(0, 1)[0], a.test(n) && (s = u.splice(0, c[n]).map(parseFloat), e = i(t, n, s), e && f.push(e)); return new t.PolyBezier(f); }
        var o = n(5), s = { x: !1, y: !1 };
        t.exports = e;
    }, function (t, r) {
        "use strict";
        function n(t) { t = t.replace(/,/g, " ").replace(/-/g, " - ").replace(/-\s+/g, "-").replace(/([a-zA-Z])/g, " $1 "); var r, n, i, e, o, s, u = t.replace(/([a-zA-Z])\s?/g, "|$1").split("|"), a = u.length, f = [], c = 0, h = 0, x = 0, l = 0, y = 0, p = 0, v = 0, d = 0, m = ""; for (r = 1; a > r; r++)
            if (n = u[r], i = n.substring(0, 1), e = i.toLowerCase(), f = n.replace(i, "").trim().split(" "), f = f.filter(function (t) { return "" !== t; }).map(parseFloat), o = f.length, "m" === e) {
                if (m += "M ", "m" === i ? (x += f[0], l += f[1]) : (x = f[0], l = f[1]), c = x, h = l, m += x + " " + l + " ", o > 2)
                    for (s = 0; o > s; s += 2)
                        "m" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["L", x, l, ""].join(" ");
            }
            else if ("l" === e)
                for (s = 0; o > s; s += 2)
                    "l" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["L", x, l, ""].join(" ");
            else if ("h" === e)
                for (s = 0; o > s; s++)
                    "h" === i ? x += f[s] : x = f[s], m += ["L", x, l, ""].join(" ");
            else if ("v" === e)
                for (s = 0; o > s; s++)
                    "v" === i ? l += f[s] : l = f[s], m += ["L", x, l, ""].join(" ");
            else if ("q" === e)
                for (s = 0; o > s; s += 4)
                    "q" === i ? (y = x + f[s], p = l + f[s + 1], x += f[s + 2], l += f[s + 3]) : (y = f[s], p = f[s + 1], x = f[s + 2], l = f[s + 3]), m += ["Q", y, p, x, l, ""].join(" ");
            else if ("t" === e)
                for (s = 0; o > s; s += 2)
                    y = x + (x - y), p = l + (l - p), "t" === i ? (x += f[s], l += f[s + 1]) : (x = f[s], l = f[s + 1]), m += ["Q", y, p, x, l, ""].join(" ");
            else if ("c" === e)
                for (s = 0; o > s; s += 6)
                    "c" === i ? (y = x + f[s], p = l + f[s + 1], v = x + f[s + 2], d = l + f[s + 3], x += f[s + 4], l += f[s + 5]) : (y = f[s], p = f[s + 1], v = f[s + 2], d = f[s + 3], x = f[s + 4], l = f[s + 5]), m += ["C", y, p, v, d, x, l, ""].join(" ");
            else if ("s" === e)
                for (s = 0; o > s; s += 4)
                    y = x + (x - v), p = l + (l - d), "s" === i ? (v = x + f[s], d = l + f[s + 1], x += f[s + 2], l += f[s + 3]) : (v = f[s], d = f[s + 1], x = f[s + 2], l = f[s + 3]), m += ["C", y, p, v, d, x, l, ""].join(" ");
            else
                "z" === e && (m += "Z ", x = c, l = h); return m.trim(); }
        t.exports = n;
    }]);
/**
  This is a JavaScript/ECMA-262 implementation of MessagePack, an efficient binary serilization format.
  https://github.com/msgpack/msgpack-javascript
  This code is MIT licensed.
**/
!function (t) { if ("object" == typeof exports && "undefined" != typeof module)
    module.exports = t();
else if ("function" == typeof define && define.amd)
    define([], t);
else {
    var r;
    r = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this, r.msgpack = t();
} }(function () {
    return function t(r, e, n) { function i(f, u) { if (!e[f]) {
        if (!r[f]) {
            var a = "function" == typeof require && require;
            if (!u && a)
                return a(f, !0);
            if (o)
                return o(f, !0);
            var s = new Error("Cannot find module '" + f + "'");
            throw s.code = "MODULE_NOT_FOUND", s;
        }
        var c = e[f] = { exports: {} };
        r[f][0].call(c.exports, function (t) { var e = r[f][1][t]; return i(e ? e : t); }, c, c.exports, t, r, e, n);
    } return e[f].exports; } for (var o = "function" == typeof require && require, f = 0; f < n.length; f++)
        i(n[f]); return i; }({ 1: [function (t, r, e) { e.encode = t("./encode").encode, e.decode = t("./decode").decode, e.Encoder = t("./encoder").Encoder, e.Decoder = t("./decoder").Decoder, e.createCodec = t("./ext").createCodec, e.codec = t("./codec").codec; }, { "./codec": 10, "./decode": 12, "./decoder": 13, "./encode": 15, "./encoder": 16, "./ext": 20 }], 2: [function (t, r, e) { (function (Buffer) { function t(t) { return t && t.isBuffer && t; } r.exports = t("undefined" != typeof Buffer && Buffer) || t(this.Buffer) || t("undefined" != typeof window && window.Buffer) || this.Buffer; }).call(this, t("buffer").Buffer); }, { buffer: 29 }], 3: [function (t, r, e) { function n(t, r) { for (var e = this, n = r || (r |= 0), i = t.length, o = 0, f = 0; f < i;)
                o = t.charCodeAt(f++), o < 128 ? e[n++] = o : o < 2048 ? (e[n++] = 192 | o >>> 6, e[n++] = 128 | 63 & o) : o < 55296 || o > 57343 ? (e[n++] = 224 | o >>> 12, e[n++] = 128 | o >>> 6 & 63, e[n++] = 128 | 63 & o) : (o = (o - 55296 << 10 | t.charCodeAt(f++) - 56320) + 65536, e[n++] = 240 | o >>> 18, e[n++] = 128 | o >>> 12 & 63, e[n++] = 128 | o >>> 6 & 63, e[n++] = 128 | 63 & o); return n - r; } function i(t, r, e) { var n = this, i = 0 | r; e || (e = n.length); for (var o = "", f = 0; i < e;)
                f = n[i++], f < 128 ? o += String.fromCharCode(f) : (192 === (224 & f) ? f = (31 & f) << 6 | 63 & n[i++] : 224 === (240 & f) ? f = (15 & f) << 12 | (63 & n[i++]) << 6 | 63 & n[i++] : 240 === (248 & f) && (f = (7 & f) << 18 | (63 & n[i++]) << 12 | (63 & n[i++]) << 6 | 63 & n[i++]), f >= 65536 ? (f -= 65536, o += String.fromCharCode((f >>> 10) + 55296, (1023 & f) + 56320)) : o += String.fromCharCode(f)); return o; } function o(t, r, e, n) { var i; e || (e = 0), n || 0 === n || (n = this.length), r || (r = 0); var o = n - e; if (t === this && e < r && r < n)
                for (i = o - 1; i >= 0; i--)
                    t[i + r] = this[i + e];
            else
                for (i = 0; i < o; i++)
                    t[i + r] = this[i + e]; return o; } e.copy = o, e.toString = i, e.write = n; }, {}], 4: [function (t, r, e) { function n(t) { return new Array(t); } function i(t) { if (!o.isBuffer(t) && o.isView(t))
                t = o.Uint8Array.from(t);
            else if (o.isArrayBuffer(t))
                t = new Uint8Array(t);
            else {
                if ("string" == typeof t)
                    return o.from.call(e, t);
                if ("number" == typeof t)
                    throw new TypeError('"value" argument must not be a number');
            } return Array.prototype.slice.call(t); } var o = t("./bufferish"), e = r.exports = n(0); e.alloc = n, e.concat = o.concat, e.from = i; }, { "./bufferish": 8 }], 5: [function (t, r, e) { function n(t) { return new Buffer(t); } function i(t) { if (!o.isBuffer(t) && o.isView(t))
                t = o.Uint8Array.from(t);
            else if (o.isArrayBuffer(t))
                t = new Uint8Array(t);
            else {
                if ("string" == typeof t)
                    return o.from.call(e, t);
                if ("number" == typeof t)
                    throw new TypeError('"value" argument must not be a number');
            } return Buffer.from && 1 !== Buffer.from.length ? Buffer.from(t) : new Buffer(t); } var o = t("./bufferish"), Buffer = o.global, e = r.exports = o.hasBuffer ? n(0) : []; e.alloc = o.hasBuffer && Buffer.alloc || n, e.concat = o.concat, e.from = i; }, { "./bufferish": 8 }], 6: [function (t, r, e) { function n(t, r, e, n) { var o = a.isBuffer(this), f = a.isBuffer(t); if (o && f)
                return this.copy(t, r, e, n); if (c || o || f || !a.isView(this) || !a.isView(t))
                return u.copy.call(this, t, r, e, n); var s = e || null != n ? i.call(this, e, n) : this; return t.set(s, r), s.length; } function i(t, r) { var e = this.slice || !c && this.subarray; if (e)
                return e.call(this, t, r); var i = a.alloc.call(this, r - t); return n.call(this, i, 0, t, r), i; } function o(t, r, e) { var n = !s && a.isBuffer(this) ? this.toString : u.toString; return n.apply(this, arguments); } function f(t) { function r() { var r = this[t] || u[t]; return r.apply(this, arguments); } return r; } var u = t("./buffer-lite"); e.copy = n, e.slice = i, e.toString = o, e.write = f("write"); var a = t("./bufferish"), Buffer = a.global, s = a.hasBuffer && "TYPED_ARRAY_SUPPORT" in Buffer, c = s && !Buffer.TYPED_ARRAY_SUPPORT; }, { "./buffer-lite": 3, "./bufferish": 8 }], 7: [function (t, r, e) { function n(t) { return new Uint8Array(t); } function i(t) { if (o.isView(t)) {
                var r = t.byteOffset, n = t.byteLength;
                t = t.buffer, t.byteLength !== n && (t.slice ? t = t.slice(r, r + n) : (t = new Uint8Array(t), t.byteLength !== n && (t = Array.prototype.slice.call(t, r, r + n))));
            }
            else {
                if ("string" == typeof t)
                    return o.from.call(e, t);
                if ("number" == typeof t)
                    throw new TypeError('"value" argument must not be a number');
            } return new Uint8Array(t); } var o = t("./bufferish"), e = r.exports = o.hasArrayBuffer ? n(0) : []; e.alloc = n, e.concat = o.concat, e.from = i; }, { "./bufferish": 8 }], 8: [function (t, r, e) { function n(t) { return "string" == typeof t ? u.call(this, t) : a(this).from(t); } function i(t) { return a(this).alloc(t); } function o(t, r) { function n(t) { r += t.length; } function o(t) { a += w.copy.call(t, u, a); } r || (r = 0, Array.prototype.forEach.call(t, n)); var f = this !== e && this || t[0], u = i.call(f, r), a = 0; return Array.prototype.forEach.call(t, o), u; } function f(t) { return t instanceof ArrayBuffer || E(t); } function u(t) { var r = 3 * t.length, e = i.call(this, r), n = w.write.call(e, t); return r !== n && (e = w.slice.call(e, 0, n)), e; } function a(t) { return d(t) ? g : y(t) ? b : p(t) ? v : h ? g : l ? b : v; } function s() { return !1; } function c(t, r) { return t = "[object " + t + "]", function (e) { return null != e && {}.toString.call(r ? e[r] : e) === t; }; } var Buffer = e.global = t("./buffer-global"), h = e.hasBuffer = Buffer && !!Buffer.isBuffer, l = e.hasArrayBuffer = "undefined" != typeof ArrayBuffer, p = e.isArray = t("isarray"); e.isArrayBuffer = l ? f : s; var d = e.isBuffer = h ? Buffer.isBuffer : s, y = e.isView = l ? ArrayBuffer.isView || c("ArrayBuffer", "buffer") : s; e.alloc = i, e.concat = o, e.from = n; var v = e.Array = t("./bufferish-array"), g = e.Buffer = t("./bufferish-buffer"), b = e.Uint8Array = t("./bufferish-uint8array"), w = e.prototype = t("./bufferish-proto"), E = c("ArrayBuffer"); }, { "./buffer-global": 2, "./bufferish-array": 4, "./bufferish-buffer": 5, "./bufferish-proto": 6, "./bufferish-uint8array": 7, isarray: 34 }], 9: [function (t, r, e) { function n(t) { return this instanceof n ? (this.options = t, void this.init()) : new n(t); } function i(t) { for (var r in t)
                n.prototype[r] = o(n.prototype[r], t[r]); } function o(t, r) { function e() { return t.apply(this, arguments), r.apply(this, arguments); } return t && r ? e : t || r; } function f(t) { function r(t, r) { return r(t); } return t = t.slice(), function (e) { return t.reduce(r, e); }; } function u(t) { return s(t) ? f(t) : t; } function a(t) { return new n(t); } var s = t("isarray"); e.createCodec = a, e.install = i, e.filter = u; var c = t("./bufferish"); n.prototype.init = function () { var t = this.options; return t && t.uint8array && (this.bufferish = c.Uint8Array), this; }, e.preset = a({ preset: !0 }); }, { "./bufferish": 8, isarray: 34 }], 10: [function (t, r, e) { t("./read-core"), t("./write-core"), e.codec = { preset: t("./codec-base").preset }; }, { "./codec-base": 9, "./read-core": 22, "./write-core": 25 }], 11: [function (t, r, e) { function n(t) { if (!(this instanceof n))
                return new n(t); if (t && (this.options = t, t.codec)) {
                var r = this.codec = t.codec;
                r.bufferish && (this.bufferish = r.bufferish);
            } } e.DecodeBuffer = n; var i = t("./read-core").preset, o = t("./flex-buffer").FlexDecoder; o.mixin(n.prototype), n.prototype.codec = i, n.prototype.fetch = function () { return this.codec.decode(this); }; }, { "./flex-buffer": 21, "./read-core": 22 }], 12: [function (t, r, e) { function n(t, r) { var e = new i(r); return e.write(t), e.read(); } e.decode = n; var i = t("./decode-buffer").DecodeBuffer; }, { "./decode-buffer": 11 }], 13: [function (t, r, e) { function n(t) { return this instanceof n ? void o.call(this, t) : new n(t); } e.Decoder = n; var i = t("event-lite"), o = t("./decode-buffer").DecodeBuffer; n.prototype = new o, i.mixin(n.prototype), n.prototype.decode = function (t) { arguments.length && this.write(t), this.flush(); }, n.prototype.push = function (t) { this.emit("data", t); }, n.prototype.end = function (t) { this.decode(t), this.emit("end"); }; }, { "./decode-buffer": 11, "event-lite": 31 }], 14: [function (t, r, e) { function n(t) { if (!(this instanceof n))
                return new n(t); if (t && (this.options = t, t.codec)) {
                var r = this.codec = t.codec;
                r.bufferish && (this.bufferish = r.bufferish);
            } } e.EncodeBuffer = n; var i = t("./write-core").preset, o = t("./flex-buffer").FlexEncoder; o.mixin(n.prototype), n.prototype.codec = i, n.prototype.write = function (t) { this.codec.encode(this, t); }; }, { "./flex-buffer": 21, "./write-core": 25 }], 15: [function (t, r, e) { function n(t, r) { var e = new i(r); return e.write(t), e.read(); } e.encode = n; var i = t("./encode-buffer").EncodeBuffer; }, { "./encode-buffer": 14 }], 16: [function (t, r, e) { function n(t) { return this instanceof n ? void o.call(this, t) : new n(t); } e.Encoder = n; var i = t("event-lite"), o = t("./encode-buffer").EncodeBuffer; n.prototype = new o, i.mixin(n.prototype), n.prototype.encode = function (t) { this.write(t), this.emit("data", this.read()); }, n.prototype.end = function (t) { arguments.length && this.encode(t), this.flush(), this.emit("end"); }; }, { "./encode-buffer": 14, "event-lite": 31 }], 17: [function (t, r, e) { function n(t, r) { return this instanceof n ? (this.buffer = i.from(t), void (this.type = r)) : new n(t, r); } e.ExtBuffer = n; var i = t("./bufferish"); }, { "./bufferish": 8 }], 18: [function (t, r, e) { function n(t) { t.addExtPacker(14, Error, [u, i]), t.addExtPacker(1, EvalError, [u, i]), t.addExtPacker(2, RangeError, [u, i]), t.addExtPacker(3, ReferenceError, [u, i]), t.addExtPacker(4, SyntaxError, [u, i]), t.addExtPacker(5, TypeError, [u, i]), t.addExtPacker(6, URIError, [u, i]), t.addExtPacker(10, RegExp, [f, i]), t.addExtPacker(11, Boolean, [o, i]), t.addExtPacker(12, String, [o, i]), t.addExtPacker(13, Date, [Number, i]), t.addExtPacker(15, Number, [o, i]), "undefined" != typeof Uint8Array && (t.addExtPacker(17, Int8Array, c), t.addExtPacker(18, Uint8Array, c), t.addExtPacker(19, Int16Array, c), t.addExtPacker(20, Uint16Array, c), t.addExtPacker(21, Int32Array, c), t.addExtPacker(22, Uint32Array, c), t.addExtPacker(23, Float32Array, c), "undefined" != typeof Float64Array && t.addExtPacker(24, Float64Array, c), "undefined" != typeof Uint8ClampedArray && t.addExtPacker(25, Uint8ClampedArray, c), t.addExtPacker(26, ArrayBuffer, c), t.addExtPacker(29, DataView, c)), s.hasBuffer && t.addExtPacker(27, Buffer, s.from); } function i(r) { return a || (a = t("./encode").encode), a(r); } function o(t) { return t.valueOf(); } function f(t) { t = RegExp.prototype.toString.call(t).split("/"), t.shift(); var r = [t.pop()]; return r.unshift(t.join("/")), r; } function u(t) { var r = {}; for (var e in h)
                r[e] = t[e]; return r; } e.setExtPackers = n; var a, s = t("./bufferish"), Buffer = s.global, c = s.Uint8Array.from, h = { name: 1, message: 1, stack: 1, columnNumber: 1, fileName: 1, lineNumber: 1 }; }, { "./bufferish": 8, "./encode": 15 }], 19: [function (t, r, e) { function n(t) { t.addExtUnpacker(14, [i, f(Error)]), t.addExtUnpacker(1, [i, f(EvalError)]), t.addExtUnpacker(2, [i, f(RangeError)]), t.addExtUnpacker(3, [i, f(ReferenceError)]), t.addExtUnpacker(4, [i, f(SyntaxError)]), t.addExtUnpacker(5, [i, f(TypeError)]), t.addExtUnpacker(6, [i, f(URIError)]), t.addExtUnpacker(10, [i, o]), t.addExtUnpacker(11, [i, u(Boolean)]), t.addExtUnpacker(12, [i, u(String)]), t.addExtUnpacker(13, [i, u(Date)]), t.addExtUnpacker(15, [i, u(Number)]), "undefined" != typeof Uint8Array && (t.addExtUnpacker(17, u(Int8Array)), t.addExtUnpacker(18, u(Uint8Array)), t.addExtUnpacker(19, [a, u(Int16Array)]), t.addExtUnpacker(20, [a, u(Uint16Array)]), t.addExtUnpacker(21, [a, u(Int32Array)]), t.addExtUnpacker(22, [a, u(Uint32Array)]), t.addExtUnpacker(23, [a, u(Float32Array)]), "undefined" != typeof Float64Array && t.addExtUnpacker(24, [a, u(Float64Array)]), "undefined" != typeof Uint8ClampedArray && t.addExtUnpacker(25, u(Uint8ClampedArray)), t.addExtUnpacker(26, a), t.addExtUnpacker(29, [a, u(DataView)])), c.hasBuffer && t.addExtUnpacker(27, u(Buffer)); } function i(r) { return s || (s = t("./decode").decode), s(r); } function o(t) { return RegExp.apply(null, t); } function f(t) { return function (r) { var e = new t; for (var n in h)
                e[n] = r[n]; return e; }; } function u(t) { return function (r) { return new t(r); }; } function a(t) { return new Uint8Array(t).buffer; } e.setExtUnpackers = n; var s, c = t("./bufferish"), Buffer = c.global, h = { name: 1, message: 1, stack: 1, columnNumber: 1, fileName: 1, lineNumber: 1 }; }, { "./bufferish": 8, "./decode": 12 }], 20: [function (t, r, e) { t("./read-core"), t("./write-core"), e.createCodec = t("./codec-base").createCodec; }, { "./codec-base": 9, "./read-core": 22, "./write-core": 25 }], 21: [function (t, r, e) { function n() { if (!(this instanceof n))
                return new n; } function i() { if (!(this instanceof i))
                return new i; } function o() { function t(t) { var r = this.offset ? p.prototype.slice.call(this.buffer, this.offset) : this.buffer; this.buffer = r ? t ? this.bufferish.concat([r, t]) : r : t, this.offset = 0; } function r() { for (; this.offset < this.buffer.length;) {
                var t, r = this.offset;
                try {
                    t = this.fetch();
                }
                catch (t) {
                    if (t && t.message != v)
                        throw t;
                    this.offset = r;
                    break;
                }
                this.push(t);
            } } function e(t) { var r = this.offset, e = r + t; if (e > this.buffer.length)
                throw new Error(v); return this.offset = e, r; } return { bufferish: p, write: t, fetch: a, flush: r, push: c, pull: h, read: s, reserve: e, offset: 0 }; } function f() { function t() { var t = this.start; if (t < this.offset) {
                var r = this.start = this.offset;
                return p.prototype.slice.call(this.buffer, t, r);
            } } function r() { for (; this.start < this.offset;) {
                var t = this.fetch();
                t && this.push(t);
            } } function e() { var t = this.buffers || (this.buffers = []), r = t.length > 1 ? this.bufferish.concat(t) : t[0]; return t.length = 0, r; } function n(t) { var r = 0 | t; if (this.buffer) {
                var e = this.buffer.length, n = 0 | this.offset, i = n + r;
                if (i < e)
                    return this.offset = i, n;
                this.flush(), t = Math.max(t, Math.min(2 * e, this.maxBufferSize));
            } return t = Math.max(t, this.minBufferSize), this.buffer = this.bufferish.alloc(t), this.start = 0, this.offset = r, 0; } function i(t) { var r = t.length; if (r > this.minBufferSize)
                this.flush(), this.push(t);
            else {
                var e = this.reserve(r);
                p.prototype.copy.call(t, this.buffer, e);
            } } return { bufferish: p, write: u, fetch: t, flush: r, push: c, pull: e, read: s, reserve: n, send: i, maxBufferSize: y, minBufferSize: d, offset: 0, start: 0 }; } function u() { throw new Error("method not implemented: write()"); } function a() { throw new Error("method not implemented: fetch()"); } function s() { var t = this.buffers && this.buffers.length; return t ? (this.flush(), this.pull()) : this.fetch(); } function c(t) { var r = this.buffers || (this.buffers = []); r.push(t); } function h() { var t = this.buffers || (this.buffers = []); return t.shift(); } function l(t) { function r(r) { for (var e in t)
                r[e] = t[e]; return r; } return r; } e.FlexDecoder = n, e.FlexEncoder = i; var p = t("./bufferish"), d = 2048, y = 65536, v = "BUFFER_SHORTAGE"; n.mixin = l(o()), n.mixin(n.prototype), i.mixin = l(f()), i.mixin(i.prototype); }, { "./bufferish": 8 }], 22: [function (t, r, e) { function n(t) { function r(t) { var r = s(t), n = e[r]; if (!n)
                throw new Error("Invalid type: " + (r ? "0x" + r.toString(16) : r)); return n(t); } var e = c.getReadToken(t); return r; } function i() { var t = this.options; return this.decode = n(t), t && t.preset && a.setExtUnpackers(this), this; } function o(t, r) { var e = this.extUnpackers || (this.extUnpackers = []); e[t] = h.filter(r); } function f(t) { function r(r) { return new u(r, t); } var e = this.extUnpackers || (this.extUnpackers = []); return e[t] || r; } var u = t("./ext-buffer").ExtBuffer, a = t("./ext-unpacker"), s = t("./read-format").readUint8, c = t("./read-token"), h = t("./codec-base"); h.install({ addExtUnpacker: o, getExtUnpacker: f, init: i }), e.preset = i.call(h.preset); }, { "./codec-base": 9, "./ext-buffer": 17, "./ext-unpacker": 19, "./read-format": 23, "./read-token": 24 }], 23: [function (t, r, e) { function n(t) { var r = k.hasArrayBuffer && t && t.binarraybuffer, e = t && t.int64, n = T && t && t.usemap, B = { map: n ? o : i, array: f, str: u, bin: r ? s : a, ext: c, uint8: h, uint16: p, uint32: y, uint64: g(8, e ? E : b), int8: l, int16: d, int32: v, int64: g(8, e ? A : w), float32: g(4, m), float64: g(8, x) }; return B; } function i(t, r) { var e, n = {}, i = new Array(r), o = new Array(r), f = t.codec.decode; for (e = 0; e < r; e++)
                i[e] = f(t), o[e] = f(t); for (e = 0; e < r; e++)
                n[i[e]] = o[e]; return n; } function o(t, r) { var e, n = new Map, i = new Array(r), o = new Array(r), f = t.codec.decode; for (e = 0; e < r; e++)
                i[e] = f(t), o[e] = f(t); for (e = 0; e < r; e++)
                n.set(i[e], o[e]); return n; } function f(t, r) { for (var e = new Array(r), n = t.codec.decode, i = 0; i < r; i++)
                e[i] = n(t); return e; } function u(t, r) { var e = t.reserve(r), n = e + r; return _.toString.call(t.buffer, "utf-8", e, n); } function a(t, r) { var e = t.reserve(r), n = e + r, i = _.slice.call(t.buffer, e, n); return k.from(i); } function s(t, r) { var e = t.reserve(r), n = e + r, i = _.slice.call(t.buffer, e, n); return k.Uint8Array.from(i).buffer; } function c(t, r) { var e = t.reserve(r + 1), n = t.buffer[e++], i = e + r, o = t.codec.getExtUnpacker(n); if (!o)
                throw new Error("Invalid ext type: " + (n ? "0x" + n.toString(16) : n)); var f = _.slice.call(t.buffer, e, i); return o(f); } function h(t) { var r = t.reserve(1); return t.buffer[r]; } function l(t) { var r = t.reserve(1), e = t.buffer[r]; return 128 & e ? e - 256 : e; } function p(t) { var r = t.reserve(2), e = t.buffer; return e[r++] << 8 | e[r]; } function d(t) { var r = t.reserve(2), e = t.buffer, n = e[r++] << 8 | e[r]; return 32768 & n ? n - 65536 : n; } function y(t) { var r = t.reserve(4), e = t.buffer; return 16777216 * e[r++] + (e[r++] << 16) + (e[r++] << 8) + e[r]; } function v(t) { var r = t.reserve(4), e = t.buffer; return e[r++] << 24 | e[r++] << 16 | e[r++] << 8 | e[r]; } function g(t, r) { return function (e) { var n = e.reserve(t); return r.call(e.buffer, n, S); }; } function b(t) { return new P(this, t).toNumber(); } function w(t) { return new R(this, t).toNumber(); } function E(t) { return new P(this, t); } function A(t) { return new R(this, t); } function m(t) { return B.read(this, t, !1, 23, 4); } function x(t) { return B.read(this, t, !1, 52, 8); } var B = t("ieee754"), U = t("int64-buffer"), P = U.Uint64BE, R = U.Int64BE; e.getReadFormat = n, e.readUint8 = h; var k = t("./bufferish"), _ = t("./bufferish-proto"), T = "undefined" != typeof Map, S = !0; }, { "./bufferish": 8, "./bufferish-proto": 6, ieee754: 32, "int64-buffer": 33 }], 24: [function (t, r, e) { function n(t) { var r = s.getReadFormat(t); return t && t.useraw ? o(r) : i(r); } function i(t) { var r, e = new Array(256); for (r = 0; r <= 127; r++)
                e[r] = f(r); for (r = 128; r <= 143; r++)
                e[r] = a(r - 128, t.map); for (r = 144; r <= 159; r++)
                e[r] = a(r - 144, t.array); for (r = 160; r <= 191; r++)
                e[r] = a(r - 160, t.str); for (e[192] = f(null), e[193] = null, e[194] = f(!1), e[195] = f(!0), e[196] = u(t.uint8, t.bin), e[197] = u(t.uint16, t.bin), e[198] = u(t.uint32, t.bin), e[199] = u(t.uint8, t.ext), e[200] = u(t.uint16, t.ext), e[201] = u(t.uint32, t.ext), e[202] = t.float32, e[203] = t.float64, e[204] = t.uint8, e[205] = t.uint16, e[206] = t.uint32, e[207] = t.uint64, e[208] = t.int8, e[209] = t.int16, e[210] = t.int32, e[211] = t.int64, e[212] = a(1, t.ext), e[213] = a(2, t.ext), e[214] = a(4, t.ext), e[215] = a(8, t.ext), e[216] = a(16, t.ext), e[217] = u(t.uint8, t.str), e[218] = u(t.uint16, t.str), e[219] = u(t.uint32, t.str), e[220] = u(t.uint16, t.array), e[221] = u(t.uint32, t.array), e[222] = u(t.uint16, t.map), e[223] = u(t.uint32, t.map), r = 224; r <= 255; r++)
                e[r] = f(r - 256); return e; } function o(t) { var r, e = i(t).slice(); for (e[217] = e[196], e[218] = e[197], e[219] = e[198], r = 160; r <= 191; r++)
                e[r] = a(r - 160, t.bin); return e; } function f(t) { return function () { return t; }; } function u(t, r) { return function (e) { var n = t(e); return r(e, n); }; } function a(t, r) { return function (e) { return r(e, t); }; } var s = t("./read-format"); e.getReadToken = n; }, { "./read-format": 23 }], 25: [function (t, r, e) { function n(t) { function r(t, r) { var n = e[typeof r]; if (!n)
                throw new Error('Unsupported type "' + typeof r + '": ' + r); n(t, r); } var e = s.getWriteType(t); return r; } function i() { var t = this.options; return this.encode = n(t), t && t.preset && a.setExtPackers(this), this; } function o(t, r, e) { function n(r) { return e && (r = e(r)), new u(r, t); } e = c.filter(e); var i = r.name; if (i && "Object" !== i) {
                var o = this.extPackers || (this.extPackers = {});
                o[i] = n;
            }
            else {
                var f = this.extEncoderList || (this.extEncoderList = []);
                f.unshift([r, n]);
            } } function f(t) { var r = this.extPackers || (this.extPackers = {}), e = t.constructor, n = e && e.name && r[e.name]; if (n)
                return n; for (var i = this.extEncoderList || (this.extEncoderList = []), o = i.length, f = 0; f < o; f++) {
                var u = i[f];
                if (e === u[0])
                    return u[1];
            } } var u = t("./ext-buffer").ExtBuffer, a = t("./ext-packer"), s = t("./write-type"), c = t("./codec-base"); c.install({ addExtPacker: o, getExtPacker: f, init: i }), e.preset = i.call(c.preset); }, { "./codec-base": 9, "./ext-buffer": 17, "./ext-packer": 18, "./write-type": 27 }], 26: [function (t, r, e) { function n(t) { return t && t.uint8array ? i() : m || E.hasBuffer && t && t.safe ? f() : o(); } function i() { var t = o(); return t[202] = c(202, 4, p), t[203] = c(203, 8, d), t; } function o() { var t = w.slice(); return t[196] = u(196), t[197] = a(197), t[198] = s(198), t[199] = u(199), t[200] = a(200), t[201] = s(201), t[202] = c(202, 4, x.writeFloatBE || p, !0), t[203] = c(203, 8, x.writeDoubleBE || d, !0), t[204] = u(204), t[205] = a(205), t[206] = s(206), t[207] = c(207, 8, h), t[208] = u(208), t[209] = a(209), t[210] = s(210), t[211] = c(211, 8, l), t[217] = u(217), t[218] = a(218), t[219] = s(219), t[220] = a(220), t[221] = s(221), t[222] = a(222), t[223] = s(223), t; } function f() { var t = w.slice(); return t[196] = c(196, 1, Buffer.prototype.writeUInt8), t[197] = c(197, 2, Buffer.prototype.writeUInt16BE), t[198] = c(198, 4, Buffer.prototype.writeUInt32BE), t[199] = c(199, 1, Buffer.prototype.writeUInt8), t[200] = c(200, 2, Buffer.prototype.writeUInt16BE), t[201] = c(201, 4, Buffer.prototype.writeUInt32BE), t[202] = c(202, 4, Buffer.prototype.writeFloatBE), t[203] = c(203, 8, Buffer.prototype.writeDoubleBE), t[204] = c(204, 1, Buffer.prototype.writeUInt8), t[205] = c(205, 2, Buffer.prototype.writeUInt16BE), t[206] = c(206, 4, Buffer.prototype.writeUInt32BE), t[207] = c(207, 8, h), t[208] = c(208, 1, Buffer.prototype.writeInt8), t[209] = c(209, 2, Buffer.prototype.writeInt16BE), t[210] = c(210, 4, Buffer.prototype.writeInt32BE), t[211] = c(211, 8, l), t[217] = c(217, 1, Buffer.prototype.writeUInt8), t[218] = c(218, 2, Buffer.prototype.writeUInt16BE), t[219] = c(219, 4, Buffer.prototype.writeUInt32BE), t[220] = c(220, 2, Buffer.prototype.writeUInt16BE), t[221] = c(221, 4, Buffer.prototype.writeUInt32BE), t[222] = c(222, 2, Buffer.prototype.writeUInt16BE), t[223] = c(223, 4, Buffer.prototype.writeUInt32BE), t; } function u(t) { return function (r, e) { var n = r.reserve(2), i = r.buffer; i[n++] = t, i[n] = e; }; } function a(t) { return function (r, e) { var n = r.reserve(3), i = r.buffer; i[n++] = t, i[n++] = e >>> 8, i[n] = e; }; } function s(t) { return function (r, e) { var n = r.reserve(5), i = r.buffer; i[n++] = t, i[n++] = e >>> 24, i[n++] = e >>> 16, i[n++] = e >>> 8, i[n] = e; }; } function c(t, r, e, n) { return function (i, o) { var f = i.reserve(r + 1); i.buffer[f++] = t, e.call(i.buffer, o, f, n); }; } function h(t, r) { new g(this, r, t); } function l(t, r) { new b(this, r, t); } function p(t, r) { y.write(this, t, r, !1, 23, 4); } function d(t, r) { y.write(this, t, r, !1, 52, 8); } var y = t("ieee754"), v = t("int64-buffer"), g = v.Uint64BE, b = v.Int64BE, w = t("./write-uint8").uint8, E = t("./bufferish"), Buffer = E.global, A = E.hasBuffer && "TYPED_ARRAY_SUPPORT" in Buffer, m = A && !Buffer.TYPED_ARRAY_SUPPORT, x = E.hasBuffer && Buffer.prototype || {}; e.getWriteToken = n; }, { "./bufferish": 8, "./write-uint8": 28, ieee754: 32, "int64-buffer": 33 }], 27: [function (t, r, e) { function n(t) { function r(t, r) { var e = r ? 195 : 194; _[e](t, r); } function e(t, r) { var e, n = 0 | r; return r !== n ? (e = 203, void _[e](t, r)) : (e = -32 <= n && n <= 127 ? 255 & n : 0 <= n ? n <= 255 ? 204 : n <= 65535 ? 205 : 206 : -128 <= n ? 208 : -32768 <= n ? 209 : 210, void _[e](t, n)); } function n(t, r) { var e = 207; _[e](t, r.toArray()); } function o(t, r) { var e = 211; _[e](t, r.toArray()); } function v(t) { return t < 32 ? 1 : t <= 255 ? 2 : t <= 65535 ? 3 : 5; } function g(t) { return t < 32 ? 1 : t <= 65535 ? 3 : 5; } function b(t) { function r(r, e) { var n = e.length, i = 5 + 3 * n; r.offset = r.reserve(i); var o = r.buffer, f = t(n), u = r.offset + f; n = s.write.call(o, e, u); var a = t(n); if (f !== a) {
                var c = u + a - f, h = u + n;
                s.copy.call(o, o, c, u, h);
            } var l = 1 === a ? 160 + n : a <= 3 ? 215 + a : 219; _[l](r, n), r.offset += n; } return r; } function w(t, r) { if (null === r)
                return A(t, r); if (I(r))
                return Y(t, r); if (i(r))
                return m(t, r); if (f.isUint64BE(r))
                return n(t, r); if (u.isInt64BE(r))
                return o(t, r); var e = t.codec.getExtPacker(r); return e && (r = e(r)), r instanceof l ? U(t, r) : void D(t, r); } function E(t, r) { return I(r) ? k(t, r) : void w(t, r); } function A(t, r) { var e = 192; _[e](t, r); } function m(t, r) { var e = r.length, n = e < 16 ? 144 + e : e <= 65535 ? 220 : 221; _[n](t, e); for (var i = t.codec.encode, o = 0; o < e; o++)
                i(t, r[o]); } function x(t, r) { var e = r.length, n = e < 255 ? 196 : e <= 65535 ? 197 : 198; _[n](t, e), t.send(r); } function B(t, r) { x(t, new Uint8Array(r)); } function U(t, r) { var e = r.buffer, n = e.length, i = y[n] || (n < 255 ? 199 : n <= 65535 ? 200 : 201); _[i](t, n), h[r.type](t), t.send(e); } function P(t, r) { var e = Object.keys(r), n = e.length, i = n < 16 ? 128 + n : n <= 65535 ? 222 : 223; _[i](t, n); var o = t.codec.encode; e.forEach(function (e) { o(t, e), o(t, r[e]); }); } function R(t, r) { if (!(r instanceof Map))
                return P(t, r); var e = r.size, n = e < 16 ? 128 + e : e <= 65535 ? 222 : 223; _[n](t, e); var i = t.codec.encode; r.forEach(function (r, e, n) { i(t, e), i(t, r); }); } function k(t, r) { var e = r.length, n = e < 32 ? 160 + e : e <= 65535 ? 218 : 219; _[n](t, e), t.send(r); } var _ = c.getWriteToken(t), T = t && t.useraw, S = p && t && t.binarraybuffer, I = S ? a.isArrayBuffer : a.isBuffer, Y = S ? B : x, C = d && t && t.usemap, D = C ? R : P, O = { boolean: r, function: A, number: e, object: T ? E : w, string: b(T ? g : v), symbol: A, undefined: A }; return O; } var i = t("isarray"), o = t("int64-buffer"), f = o.Uint64BE, u = o.Int64BE, a = t("./bufferish"), s = t("./bufferish-proto"), c = t("./write-token"), h = t("./write-uint8").uint8, l = t("./ext-buffer").ExtBuffer, p = "undefined" != typeof Uint8Array, d = "undefined" != typeof Map, y = []; y[1] = 212, y[2] = 213, y[4] = 214, y[8] = 215, y[16] = 216, e.getWriteType = n; }, { "./bufferish": 8, "./bufferish-proto": 6, "./ext-buffer": 17, "./write-token": 26, "./write-uint8": 28, "int64-buffer": 33, isarray: 34 }], 28: [function (t, r, e) { function n(t) { return function (r) { var e = r.reserve(1); r.buffer[e] = t; }; } for (var i = e.uint8 = new Array(256), o = 0; o <= 255; o++)
                i[o] = n(o); }, {}], 29: [function (t, r, e) {
                (function (r) {
                    "use strict";
                    function n() { try {
                        var t = new Uint8Array(1);
                        return t.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42; } }, 42 === t.foo() && "function" == typeof t.subarray && 0 === t.subarray(1, 1).byteLength;
                    }
                    catch (t) {
                        return !1;
                    } }
                    function i() { return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823; }
                    function o(t, r) { if (i() < r)
                        throw new RangeError("Invalid typed array length"); return Buffer.TYPED_ARRAY_SUPPORT ? (t = new Uint8Array(r), t.__proto__ = Buffer.prototype) : (null === t && (t = new Buffer(r)), t.length = r), t; }
                    function Buffer(t, r, e) { if (!(Buffer.TYPED_ARRAY_SUPPORT || this instanceof Buffer))
                        return new Buffer(t, r, e); if ("number" == typeof t) {
                        if ("string" == typeof r)
                            throw new Error("If encoding is specified then the first argument must be a string");
                        return s(this, t);
                    } return f(this, t, r, e); }
                    function f(t, r, e, n) { if ("number" == typeof r)
                        throw new TypeError('"value" argument must not be a number'); return "undefined" != typeof ArrayBuffer && r instanceof ArrayBuffer ? l(t, r, e, n) : "string" == typeof r ? c(t, r, e) : p(t, r); }
                    function u(t) { if ("number" != typeof t)
                        throw new TypeError('"size" argument must be a number'); if (t < 0)
                        throw new RangeError('"size" argument must not be negative'); }
                    function a(t, r, e, n) { return u(r), r <= 0 ? o(t, r) : void 0 !== e ? "string" == typeof n ? o(t, r).fill(e, n) : o(t, r).fill(e) : o(t, r); }
                    function s(t, r) { if (u(r), t = o(t, r < 0 ? 0 : 0 | d(r)), !Buffer.TYPED_ARRAY_SUPPORT)
                        for (var e = 0; e < r; ++e)
                            t[e] = 0; return t; }
                    function c(t, r, e) { if ("string" == typeof e && "" !== e || (e = "utf8"), !Buffer.isEncoding(e))
                        throw new TypeError('"encoding" must be a valid string encoding'); var n = 0 | v(r, e); t = o(t, n); var i = t.write(r, e); return i !== n && (t = t.slice(0, i)), t; }
                    function h(t, r) { var e = r.length < 0 ? 0 : 0 | d(r.length); t = o(t, e); for (var n = 0; n < e; n += 1)
                        t[n] = 255 & r[n]; return t; }
                    function l(t, r, e, n) { if (r.byteLength, e < 0 || r.byteLength < e)
                        throw new RangeError("'offset' is out of bounds"); if (r.byteLength < e + (n || 0))
                        throw new RangeError("'length' is out of bounds"); return r = void 0 === e && void 0 === n ? new Uint8Array(r) : void 0 === n ? new Uint8Array(r, e) : new Uint8Array(r, e, n), Buffer.TYPED_ARRAY_SUPPORT ? (t = r, t.__proto__ = Buffer.prototype) : t = h(t, r), t; }
                    function p(t, r) { if (Buffer.isBuffer(r)) {
                        var e = 0 | d(r.length);
                        return t = o(t, e), 0 === t.length ? t : (r.copy(t, 0, 0, e), t);
                    } if (r) {
                        if ("undefined" != typeof ArrayBuffer && r.buffer instanceof ArrayBuffer || "length" in r)
                            return "number" != typeof r.length || H(r.length) ? o(t, 0) : h(t, r);
                        if ("Buffer" === r.type && Q(r.data))
                            return h(t, r.data);
                    } throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object."); }
                    function d(t) { if (t >= i())
                        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + i().toString(16) + " bytes"); return 0 | t; }
                    function y(t) { return +t != t && (t = 0), Buffer.alloc(+t); }
                    function v(t, r) { if (Buffer.isBuffer(t))
                        return t.length; if ("undefined" != typeof ArrayBuffer && "function" == typeof ArrayBuffer.isView && (ArrayBuffer.isView(t) || t instanceof ArrayBuffer))
                        return t.byteLength; "string" != typeof t && (t = "" + t); var e = t.length; if (0 === e)
                        return 0; for (var n = !1;;)
                        switch (r) {
                            case "ascii":
                            case "latin1":
                            case "binary": return e;
                            case "utf8":
                            case "utf-8":
                            case void 0: return q(t).length;
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le": return 2 * e;
                            case "hex": return e >>> 1;
                            case "base64": return X(t).length;
                            default:
                                if (n)
                                    return q(t).length;
                                r = ("" + r).toLowerCase(), n = !0;
                        } }
                    function g(t, r, e) { var n = !1; if ((void 0 === r || r < 0) && (r = 0), r > this.length)
                        return ""; if ((void 0 === e || e > this.length) && (e = this.length), e <= 0)
                        return ""; if (e >>>= 0, r >>>= 0, e <= r)
                        return ""; for (t || (t = "utf8");;)
                        switch (t) {
                            case "hex": return I(this, r, e);
                            case "utf8":
                            case "utf-8": return k(this, r, e);
                            case "ascii": return T(this, r, e);
                            case "latin1":
                            case "binary": return S(this, r, e);
                            case "base64": return R(this, r, e);
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le": return Y(this, r, e);
                            default:
                                if (n)
                                    throw new TypeError("Unknown encoding: " + t);
                                t = (t + "").toLowerCase(), n = !0;
                        } }
                    function b(t, r, e) { var n = t[r]; t[r] = t[e], t[e] = n; }
                    function w(t, r, e, n, i) { if (0 === t.length)
                        return -1; if ("string" == typeof e ? (n = e, e = 0) : e > 2147483647 ? e = 2147483647 : e < -2147483648 && (e = -2147483648), e = +e, isNaN(e) && (e = i ? 0 : t.length - 1), e < 0 && (e = t.length + e), e >= t.length) {
                        if (i)
                            return -1;
                        e = t.length - 1;
                    }
                    else if (e < 0) {
                        if (!i)
                            return -1;
                        e = 0;
                    } if ("string" == typeof r && (r = Buffer.from(r, n)), Buffer.isBuffer(r))
                        return 0 === r.length ? -1 : E(t, r, e, n, i); if ("number" == typeof r)
                        return r = 255 & r, Buffer.TYPED_ARRAY_SUPPORT && "function" == typeof Uint8Array.prototype.indexOf ? i ? Uint8Array.prototype.indexOf.call(t, r, e) : Uint8Array.prototype.lastIndexOf.call(t, r, e) : E(t, [r], e, n, i); throw new TypeError("val must be string, number or Buffer"); }
                    function E(t, r, e, n, i) { function o(t, r) { return 1 === f ? t[r] : t.readUInt16BE(r * f); } var f = 1, u = t.length, a = r.length; if (void 0 !== n && (n = String(n).toLowerCase(), "ucs2" === n || "ucs-2" === n || "utf16le" === n || "utf-16le" === n)) {
                        if (t.length < 2 || r.length < 2)
                            return -1;
                        f = 2, u /= 2, a /= 2, e /= 2;
                    } var s; if (i) {
                        var c = -1;
                        for (s = e; s < u; s++)
                            if (o(t, s) === o(r, c === -1 ? 0 : s - c)) {
                                if (c === -1 && (c = s), s - c + 1 === a)
                                    return c * f;
                            }
                            else
                                c !== -1 && (s -= s - c), c = -1;
                    }
                    else
                        for (e + a > u && (e = u - a), s = e; s >= 0; s--) {
                            for (var h = !0, l = 0; l < a; l++)
                                if (o(t, s + l) !== o(r, l)) {
                                    h = !1;
                                    break;
                                }
                            if (h)
                                return s;
                        } return -1; }
                    function A(t, r, e, n) { e = Number(e) || 0; var i = t.length - e; n ? (n = Number(n), n > i && (n = i)) : n = i; var o = r.length; if (o % 2 !== 0)
                        throw new TypeError("Invalid hex string"); n > o / 2 && (n = o / 2); for (var f = 0; f < n; ++f) {
                        var u = parseInt(r.substr(2 * f, 2), 16);
                        if (isNaN(u))
                            return f;
                        t[e + f] = u;
                    } return f; }
                    function m(t, r, e, n) { return G(q(r, t.length - e), t, e, n); }
                    function x(t, r, e, n) { return G(W(r), t, e, n); }
                    function B(t, r, e, n) { return x(t, r, e, n); }
                    function U(t, r, e, n) { return G(X(r), t, e, n); }
                    function P(t, r, e, n) { return G(J(r, t.length - e), t, e, n); }
                    function R(t, r, e) { return 0 === r && e === t.length ? Z.fromByteArray(t) : Z.fromByteArray(t.slice(r, e)); }
                    function k(t, r, e) { e = Math.min(t.length, e); for (var n = [], i = r; i < e;) {
                        var o = t[i], f = null, u = o > 239 ? 4 : o > 223 ? 3 : o > 191 ? 2 : 1;
                        if (i + u <= e) {
                            var a, s, c, h;
                            switch (u) {
                                case 1:
                                    o < 128 && (f = o);
                                    break;
                                case 2:
                                    a = t[i + 1], 128 === (192 & a) && (h = (31 & o) << 6 | 63 & a, h > 127 && (f = h));
                                    break;
                                case 3:
                                    a = t[i + 1], s = t[i + 2], 128 === (192 & a) && 128 === (192 & s) && (h = (15 & o) << 12 | (63 & a) << 6 | 63 & s, h > 2047 && (h < 55296 || h > 57343) && (f = h));
                                    break;
                                case 4: a = t[i + 1], s = t[i + 2], c = t[i + 3], 128 === (192 & a) && 128 === (192 & s) && 128 === (192 & c) && (h = (15 & o) << 18 | (63 & a) << 12 | (63 & s) << 6 | 63 & c, h > 65535 && h < 1114112 && (f = h));
                            }
                        }
                        null === f ? (f = 65533, u = 1) : f > 65535 && (f -= 65536, n.push(f >>> 10 & 1023 | 55296), f = 56320 | 1023 & f), n.push(f), i += u;
                    } return _(n); }
                    function _(t) { var r = t.length; if (r <= $)
                        return String.fromCharCode.apply(String, t); for (var e = "", n = 0; n < r;)
                        e += String.fromCharCode.apply(String, t.slice(n, n += $)); return e; }
                    function T(t, r, e) { var n = ""; e = Math.min(t.length, e); for (var i = r; i < e; ++i)
                        n += String.fromCharCode(127 & t[i]); return n; }
                    function S(t, r, e) { var n = ""; e = Math.min(t.length, e); for (var i = r; i < e; ++i)
                        n += String.fromCharCode(t[i]); return n; }
                    function I(t, r, e) { var n = t.length; (!r || r < 0) && (r = 0), (!e || e < 0 || e > n) && (e = n); for (var i = "", o = r; o < e; ++o)
                        i += V(t[o]); return i; }
                    function Y(t, r, e) { for (var n = t.slice(r, e), i = "", o = 0; o < n.length; o += 2)
                        i += String.fromCharCode(n[o] + 256 * n[o + 1]); return i; }
                    function C(t, r, e) { if (t % 1 !== 0 || t < 0)
                        throw new RangeError("offset is not uint"); if (t + r > e)
                        throw new RangeError("Trying to access beyond buffer length"); }
                    function D(t, r, e, n, i, o) { if (!Buffer.isBuffer(t))
                        throw new TypeError('"buffer" argument must be a Buffer instance'); if (r > i || r < o)
                        throw new RangeError('"value" argument is out of bounds'); if (e + n > t.length)
                        throw new RangeError("Index out of range"); }
                    function O(t, r, e, n) { r < 0 && (r = 65535 + r + 1); for (var i = 0, o = Math.min(t.length - e, 2); i < o; ++i)
                        t[e + i] = (r & 255 << 8 * (n ? i : 1 - i)) >>> 8 * (n ? i : 1 - i); }
                    function L(t, r, e, n) { r < 0 && (r = 4294967295 + r + 1); for (var i = 0, o = Math.min(t.length - e, 4); i < o; ++i)
                        t[e + i] = r >>> 8 * (n ? i : 3 - i) & 255; }
                    function M(t, r, e, n, i, o) { if (e + n > t.length)
                        throw new RangeError("Index out of range"); if (e < 0)
                        throw new RangeError("Index out of range"); }
                    function N(t, r, e, n, i) { return i || M(t, r, e, 4, 3.4028234663852886e38, -3.4028234663852886e38), K.write(t, r, e, n, 23, 4), e + 4; }
                    function F(t, r, e, n, i) { return i || M(t, r, e, 8, 1.7976931348623157e308, -1.7976931348623157e308), K.write(t, r, e, n, 52, 8), e + 8; }
                    function j(t) {
                        if (t = z(t).replace(tt, ""), t.length < 2)
                            return "";
                        for (; t.length % 4 !== 0;)
                            t += "=";
                        return t;
                    }
                    function z(t) { return t.trim ? t.trim() : t.replace(/^\s+|\s+$/g, ""); }
                    function V(t) { return t < 16 ? "0" + t.toString(16) : t.toString(16); }
                    function q(t, r) { r = r || 1 / 0; for (var e, n = t.length, i = null, o = [], f = 0; f < n; ++f) {
                        if (e = t.charCodeAt(f), e > 55295 && e < 57344) {
                            if (!i) {
                                if (e > 56319) {
                                    (r -= 3) > -1 && o.push(239, 191, 189);
                                    continue;
                                }
                                if (f + 1 === n) {
                                    (r -= 3) > -1 && o.push(239, 191, 189);
                                    continue;
                                }
                                i = e;
                                continue;
                            }
                            if (e < 56320) {
                                (r -= 3) > -1 && o.push(239, 191, 189), i = e;
                                continue;
                            }
                            e = (i - 55296 << 10 | e - 56320) + 65536;
                        }
                        else
                            i && (r -= 3) > -1 && o.push(239, 191, 189);
                        if (i = null, e < 128) {
                            if ((r -= 1) < 0)
                                break;
                            o.push(e);
                        }
                        else if (e < 2048) {
                            if ((r -= 2) < 0)
                                break;
                            o.push(e >> 6 | 192, 63 & e | 128);
                        }
                        else if (e < 65536) {
                            if ((r -= 3) < 0)
                                break;
                            o.push(e >> 12 | 224, e >> 6 & 63 | 128, 63 & e | 128);
                        }
                        else {
                            if (!(e < 1114112))
                                throw new Error("Invalid code point");
                            if ((r -= 4) < 0)
                                break;
                            o.push(e >> 18 | 240, e >> 12 & 63 | 128, e >> 6 & 63 | 128, 63 & e | 128);
                        }
                    } return o; }
                    function W(t) { for (var r = [], e = 0; e < t.length; ++e)
                        r.push(255 & t.charCodeAt(e)); return r; }
                    function J(t, r) { for (var e, n, i, o = [], f = 0; f < t.length && !((r -= 2) < 0); ++f)
                        e = t.charCodeAt(f), n = e >> 8, i = e % 256, o.push(i), o.push(n); return o; }
                    function X(t) { return Z.toByteArray(j(t)); }
                    function G(t, r, e, n) { for (var i = 0; i < n && !(i + e >= r.length || i >= t.length); ++i)
                        r[i + e] = t[i]; return i; }
                    function H(t) { return t !== t; }
                    var Z = t("base64-js"), K = t("ieee754"), Q = t("isarray");
                    e.Buffer = Buffer, e.SlowBuffer = y, e.INSPECT_MAX_BYTES = 50, Buffer.TYPED_ARRAY_SUPPORT = void 0 !== r.TYPED_ARRAY_SUPPORT ? r.TYPED_ARRAY_SUPPORT : n(), e.kMaxLength = i(), Buffer.poolSize = 8192, Buffer._augment = function (t) { return t.__proto__ = Buffer.prototype, t; }, Buffer.from = function (t, r, e) { return f(null, t, r, e); }, Buffer.TYPED_ARRAY_SUPPORT && (Buffer.prototype.__proto__ = Uint8Array.prototype, Buffer.__proto__ = Uint8Array, "undefined" != typeof Symbol && Symbol.species && Buffer[Symbol.species] === Buffer && Object.defineProperty(Buffer, Symbol.species, { value: null, configurable: !0 })), Buffer.alloc = function (t, r, e) { return a(null, t, r, e); }, Buffer.allocUnsafe = function (t) { return s(null, t); }, Buffer.allocUnsafeSlow = function (t) { return s(null, t); }, Buffer.isBuffer = function (t) { return !(null == t || !t._isBuffer); }, Buffer.compare = function (t, r) { if (!Buffer.isBuffer(t) || !Buffer.isBuffer(r))
                        throw new TypeError("Arguments must be Buffers"); if (t === r)
                        return 0; for (var e = t.length, n = r.length, i = 0, o = Math.min(e, n); i < o; ++i)
                        if (t[i] !== r[i]) {
                            e = t[i], n = r[i];
                            break;
                        } return e < n ? -1 : n < e ? 1 : 0; }, Buffer.isEncoding = function (t) { switch (String(t).toLowerCase()) {
                        case "hex":
                        case "utf8":
                        case "utf-8":
                        case "ascii":
                        case "latin1":
                        case "binary":
                        case "base64":
                        case "ucs2":
                        case "ucs-2":
                        case "utf16le":
                        case "utf-16le": return !0;
                        default: return !1;
                    } }, Buffer.concat = function (t, r) { if (!Q(t))
                        throw new TypeError('"list" argument must be an Array of Buffers'); if (0 === t.length)
                        return Buffer.alloc(0); var e; if (void 0 === r)
                        for (r = 0, e = 0; e < t.length; ++e)
                            r += t[e].length; var n = Buffer.allocUnsafe(r), i = 0; for (e = 0; e < t.length; ++e) {
                        var o = t[e];
                        if (!Buffer.isBuffer(o))
                            throw new TypeError('"list" argument must be an Array of Buffers');
                        o.copy(n, i), i += o.length;
                    } return n; }, Buffer.byteLength = v, Buffer.prototype._isBuffer = !0, Buffer.prototype.swap16 = function () { var t = this.length; if (t % 2 !== 0)
                        throw new RangeError("Buffer size must be a multiple of 16-bits"); for (var r = 0; r < t; r += 2)
                        b(this, r, r + 1); return this; }, Buffer.prototype.swap32 = function () { var t = this.length; if (t % 4 !== 0)
                        throw new RangeError("Buffer size must be a multiple of 32-bits"); for (var r = 0; r < t; r += 4)
                        b(this, r, r + 3), b(this, r + 1, r + 2); return this; }, Buffer.prototype.swap64 = function () { var t = this.length; if (t % 8 !== 0)
                        throw new RangeError("Buffer size must be a multiple of 64-bits"); for (var r = 0; r < t; r += 8)
                        b(this, r, r + 7), b(this, r + 1, r + 6), b(this, r + 2, r + 5), b(this, r + 3, r + 4); return this; }, Buffer.prototype.toString = function () { var t = 0 | this.length; return 0 === t ? "" : 0 === arguments.length ? k(this, 0, t) : g.apply(this, arguments); }, Buffer.prototype.equals = function (t) { if (!Buffer.isBuffer(t))
                        throw new TypeError("Argument must be a Buffer"); return this === t || 0 === Buffer.compare(this, t); }, Buffer.prototype.inspect = function () { var t = "", r = e.INSPECT_MAX_BYTES; return this.length > 0 && (t = this.toString("hex", 0, r).match(/.{2}/g).join(" "), this.length > r && (t += " ... ")), "<Buffer " + t + ">"; }, Buffer.prototype.compare = function (t, r, e, n, i) { if (!Buffer.isBuffer(t))
                        throw new TypeError("Argument must be a Buffer"); if (void 0 === r && (r = 0), void 0 === e && (e = t ? t.length : 0), void 0 === n && (n = 0), void 0 === i && (i = this.length), r < 0 || e > t.length || n < 0 || i > this.length)
                        throw new RangeError("out of range index"); if (n >= i && r >= e)
                        return 0; if (n >= i)
                        return -1; if (r >= e)
                        return 1; if (r >>>= 0, e >>>= 0, n >>>= 0, i >>>= 0, this === t)
                        return 0; for (var o = i - n, f = e - r, u = Math.min(o, f), a = this.slice(n, i), s = t.slice(r, e), c = 0; c < u; ++c)
                        if (a[c] !== s[c]) {
                            o = a[c], f = s[c];
                            break;
                        } return o < f ? -1 : f < o ? 1 : 0; }, Buffer.prototype.includes = function (t, r, e) { return this.indexOf(t, r, e) !== -1; }, Buffer.prototype.indexOf = function (t, r, e) { return w(this, t, r, e, !0); }, Buffer.prototype.lastIndexOf = function (t, r, e) { return w(this, t, r, e, !1); }, Buffer.prototype.write = function (t, r, e, n) { if (void 0 === r)
                        n = "utf8", e = this.length, r = 0;
                    else if (void 0 === e && "string" == typeof r)
                        n = r, e = this.length, r = 0;
                    else {
                        if (!isFinite(r))
                            throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
                        r = 0 | r, isFinite(e) ? (e = 0 | e, void 0 === n && (n = "utf8")) : (n = e, e = void 0);
                    } var i = this.length - r; if ((void 0 === e || e > i) && (e = i), t.length > 0 && (e < 0 || r < 0) || r > this.length)
                        throw new RangeError("Attempt to write outside buffer bounds"); n || (n = "utf8"); for (var o = !1;;)
                        switch (n) {
                            case "hex": return A(this, t, r, e);
                            case "utf8":
                            case "utf-8": return m(this, t, r, e);
                            case "ascii": return x(this, t, r, e);
                            case "latin1":
                            case "binary": return B(this, t, r, e);
                            case "base64": return U(this, t, r, e);
                            case "ucs2":
                            case "ucs-2":
                            case "utf16le":
                            case "utf-16le": return P(this, t, r, e);
                            default:
                                if (o)
                                    throw new TypeError("Unknown encoding: " + n);
                                n = ("" + n).toLowerCase(), o = !0;
                        } }, Buffer.prototype.toJSON = function () { return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) }; };
                    var $ = 4096;
                    Buffer.prototype.slice = function (t, r) { var e = this.length; t = ~~t, r = void 0 === r ? e : ~~r, t < 0 ? (t += e, t < 0 && (t = 0)) : t > e && (t = e), r < 0 ? (r += e, r < 0 && (r = 0)) : r > e && (r = e), r < t && (r = t); var n; if (Buffer.TYPED_ARRAY_SUPPORT)
                        n = this.subarray(t, r), n.__proto__ = Buffer.prototype;
                    else {
                        var i = r - t;
                        n = new Buffer(i, void 0);
                        for (var o = 0; o < i; ++o)
                            n[o] = this[o + t];
                    } return n; }, Buffer.prototype.readUIntLE = function (t, r, e) { t = 0 | t, r = 0 | r, e || C(t, r, this.length); for (var n = this[t], i = 1, o = 0; ++o < r && (i *= 256);)
                        n += this[t + o] * i; return n; }, Buffer.prototype.readUIntBE = function (t, r, e) { t = 0 | t, r = 0 | r, e || C(t, r, this.length); for (var n = this[t + --r], i = 1; r > 0 && (i *= 256);)
                        n += this[t + --r] * i; return n; }, Buffer.prototype.readUInt8 = function (t, r) { return r || C(t, 1, this.length), this[t]; }, Buffer.prototype.readUInt16LE = function (t, r) { return r || C(t, 2, this.length), this[t] | this[t + 1] << 8; }, Buffer.prototype.readUInt16BE = function (t, r) { return r || C(t, 2, this.length), this[t] << 8 | this[t + 1]; }, Buffer.prototype.readUInt32LE = function (t, r) { return r || C(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + 16777216 * this[t + 3]; }, Buffer.prototype.readUInt32BE = function (t, r) { return r || C(t, 4, this.length), 16777216 * this[t] + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]); }, Buffer.prototype.readIntLE = function (t, r, e) { t = 0 | t, r = 0 | r, e || C(t, r, this.length); for (var n = this[t], i = 1, o = 0; ++o < r && (i *= 256);)
                        n += this[t + o] * i; return i *= 128, n >= i && (n -= Math.pow(2, 8 * r)), n; }, Buffer.prototype.readIntBE = function (t, r, e) { t = 0 | t, r = 0 | r, e || C(t, r, this.length); for (var n = r, i = 1, o = this[t + --n]; n > 0 && (i *= 256);)
                        o += this[t + --n] * i; return i *= 128, o >= i && (o -= Math.pow(2, 8 * r)), o; }, Buffer.prototype.readInt8 = function (t, r) { return r || C(t, 1, this.length), 128 & this[t] ? (255 - this[t] + 1) * -1 : this[t]; }, Buffer.prototype.readInt16LE = function (t, r) { r || C(t, 2, this.length); var e = this[t] | this[t + 1] << 8; return 32768 & e ? 4294901760 | e : e; }, Buffer.prototype.readInt16BE = function (t, r) { r || C(t, 2, this.length); var e = this[t + 1] | this[t] << 8; return 32768 & e ? 4294901760 | e : e; }, Buffer.prototype.readInt32LE = function (t, r) { return r || C(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24; }, Buffer.prototype.readInt32BE = function (t, r) { return r || C(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]; }, Buffer.prototype.readFloatLE = function (t, r) { return r || C(t, 4, this.length), K.read(this, t, !0, 23, 4); }, Buffer.prototype.readFloatBE = function (t, r) { return r || C(t, 4, this.length), K.read(this, t, !1, 23, 4); }, Buffer.prototype.readDoubleLE = function (t, r) { return r || C(t, 8, this.length), K.read(this, t, !0, 52, 8); }, Buffer.prototype.readDoubleBE = function (t, r) { return r || C(t, 8, this.length), K.read(this, t, !1, 52, 8); }, Buffer.prototype.writeUIntLE = function (t, r, e, n) { if (t = +t, r = 0 | r, e = 0 | e, !n) {
                        var i = Math.pow(2, 8 * e) - 1;
                        D(this, t, r, e, i, 0);
                    } var o = 1, f = 0; for (this[r] = 255 & t; ++f < e && (o *= 256);)
                        this[r + f] = t / o & 255; return r + e; }, Buffer.prototype.writeUIntBE = function (t, r, e, n) { if (t = +t, r = 0 | r, e = 0 | e, !n) {
                        var i = Math.pow(2, 8 * e) - 1;
                        D(this, t, r, e, i, 0);
                    } var o = e - 1, f = 1; for (this[r + o] = 255 & t; --o >= 0 && (f *= 256);)
                        this[r + o] = t / f & 255; return r + e; }, Buffer.prototype.writeUInt8 = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 1, 255, 0), Buffer.TYPED_ARRAY_SUPPORT || (t = Math.floor(t)), this[r] = 255 & t, r + 1; }, Buffer.prototype.writeUInt16LE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 2, 65535, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = 255 & t, this[r + 1] = t >>> 8) : O(this, t, r, !0), r + 2; }, Buffer.prototype.writeUInt16BE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 2, 65535, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = t >>> 8, this[r + 1] = 255 & t) : O(this, t, r, !1), r + 2; }, Buffer.prototype.writeUInt32LE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 4, 4294967295, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = 255 & t) : L(this, t, r, !0), r + 4; }, Buffer.prototype.writeUInt32BE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 4, 4294967295, 0), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = 255 & t) : L(this, t, r, !1), r + 4; }, Buffer.prototype.writeIntLE = function (t, r, e, n) { if (t = +t, r = 0 | r, !n) {
                        var i = Math.pow(2, 8 * e - 1);
                        D(this, t, r, e, i - 1, -i);
                    } var o = 0, f = 1, u = 0; for (this[r] = 255 & t; ++o < e && (f *= 256);)
                        t < 0 && 0 === u && 0 !== this[r + o - 1] && (u = 1), this[r + o] = (t / f >> 0) - u & 255; return r + e; }, Buffer.prototype.writeIntBE = function (t, r, e, n) { if (t = +t, r = 0 | r, !n) {
                        var i = Math.pow(2, 8 * e - 1);
                        D(this, t, r, e, i - 1, -i);
                    } var o = e - 1, f = 1, u = 0; for (this[r + o] = 255 & t; --o >= 0 && (f *= 256);)
                        t < 0 && 0 === u && 0 !== this[r + o + 1] && (u = 1), this[r + o] = (t / f >> 0) - u & 255; return r + e; }, Buffer.prototype.writeInt8 = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 1, 127, -128), Buffer.TYPED_ARRAY_SUPPORT || (t = Math.floor(t)), t < 0 && (t = 255 + t + 1), this[r] = 255 & t, r + 1; }, Buffer.prototype.writeInt16LE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 2, 32767, -32768), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = 255 & t, this[r + 1] = t >>> 8) : O(this, t, r, !0), r + 2; }, Buffer.prototype.writeInt16BE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 2, 32767, -32768), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = t >>> 8, this[r + 1] = 255 & t) : O(this, t, r, !1), r + 2; }, Buffer.prototype.writeInt32LE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 4, 2147483647, -2147483648), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = 255 & t, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24) : L(this, t, r, !0), r + 4; }, Buffer.prototype.writeInt32BE = function (t, r, e) { return t = +t, r = 0 | r, e || D(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), Buffer.TYPED_ARRAY_SUPPORT ? (this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = 255 & t) : L(this, t, r, !1), r + 4; }, Buffer.prototype.writeFloatLE = function (t, r, e) { return N(this, t, r, !0, e); }, Buffer.prototype.writeFloatBE = function (t, r, e) { return N(this, t, r, !1, e); }, Buffer.prototype.writeDoubleLE = function (t, r, e) { return F(this, t, r, !0, e); }, Buffer.prototype.writeDoubleBE = function (t, r, e) { return F(this, t, r, !1, e); }, Buffer.prototype.copy = function (t, r, e, n) { if (e || (e = 0), n || 0 === n || (n = this.length), r >= t.length && (r = t.length), r || (r = 0), n > 0 && n < e && (n = e), n === e)
                        return 0; if (0 === t.length || 0 === this.length)
                        return 0; if (r < 0)
                        throw new RangeError("targetStart out of bounds"); if (e < 0 || e >= this.length)
                        throw new RangeError("sourceStart out of bounds"); if (n < 0)
                        throw new RangeError("sourceEnd out of bounds"); n > this.length && (n = this.length), t.length - r < n - e && (n = t.length - r + e); var i, o = n - e; if (this === t && e < r && r < n)
                        for (i = o - 1; i >= 0; --i)
                            t[i + r] = this[i + e];
                    else if (o < 1e3 || !Buffer.TYPED_ARRAY_SUPPORT)
                        for (i = 0; i < o; ++i)
                            t[i + r] = this[i + e];
                    else
                        Uint8Array.prototype.set.call(t, this.subarray(e, e + o), r); return o; }, Buffer.prototype.fill = function (t, r, e, n) { if ("string" == typeof t) {
                        if ("string" == typeof r ? (n = r, r = 0, e = this.length) : "string" == typeof e && (n = e, e = this.length), 1 === t.length) {
                            var i = t.charCodeAt(0);
                            i < 256 && (t = i);
                        }
                        if (void 0 !== n && "string" != typeof n)
                            throw new TypeError("encoding must be a string");
                        if ("string" == typeof n && !Buffer.isEncoding(n))
                            throw new TypeError("Unknown encoding: " + n);
                    }
                    else
                        "number" == typeof t && (t = 255 & t); if (r < 0 || this.length < r || this.length < e)
                        throw new RangeError("Out of range index"); if (e <= r)
                        return this; r >>>= 0, e = void 0 === e ? this.length : e >>> 0, t || (t = 0); var o; if ("number" == typeof t)
                        for (o = r; o < e; ++o)
                            this[o] = t;
                    else {
                        var f = Buffer.isBuffer(t) ? t : q(new Buffer(t, n).toString()), u = f.length;
                        for (o = 0; o < e - r; ++o)
                            this[o + r] = f[o % u];
                    } return this; };
                    var tt = /[^+\/0-9A-Za-z-_]/g;
                }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
            }, { "base64-js": 30, ieee754: 32, isarray: 34 }], 30: [function (t, r, e) {
                "use strict";
                function n(t) { var r = t.length; if (r % 4 > 0)
                    throw new Error("Invalid string. Length must be a multiple of 4"); return "=" === t[r - 2] ? 2 : "=" === t[r - 1] ? 1 : 0; }
                function i(t) { return 3 * t.length / 4 - n(t); }
                function o(t) { var r, e, i, o, f, u, a = t.length; f = n(t), u = new h(3 * a / 4 - f), i = f > 0 ? a - 4 : a; var s = 0; for (r = 0, e = 0; r < i; r += 4, e += 3)
                    o = c[t.charCodeAt(r)] << 18 | c[t.charCodeAt(r + 1)] << 12 | c[t.charCodeAt(r + 2)] << 6 | c[t.charCodeAt(r + 3)], u[s++] = o >> 16 & 255, u[s++] = o >> 8 & 255, u[s++] = 255 & o; return 2 === f ? (o = c[t.charCodeAt(r)] << 2 | c[t.charCodeAt(r + 1)] >> 4, u[s++] = 255 & o) : 1 === f && (o = c[t.charCodeAt(r)] << 10 | c[t.charCodeAt(r + 1)] << 4 | c[t.charCodeAt(r + 2)] >> 2, u[s++] = o >> 8 & 255, u[s++] = 255 & o), u; }
                function f(t) { return s[t >> 18 & 63] + s[t >> 12 & 63] + s[t >> 6 & 63] + s[63 & t]; }
                function u(t, r, e) { for (var n, i = [], o = r; o < e; o += 3)
                    n = (t[o] << 16) + (t[o + 1] << 8) + t[o + 2], i.push(f(n)); return i.join(""); }
                function a(t) { for (var r, e = t.length, n = e % 3, i = "", o = [], f = 16383, a = 0, c = e - n; a < c; a += f)
                    o.push(u(t, a, a + f > c ? c : a + f)); return 1 === n ? (r = t[e - 1], i += s[r >> 2], i += s[r << 4 & 63], i += "==") : 2 === n && (r = (t[e - 2] << 8) + t[e - 1], i += s[r >> 10], i += s[r >> 4 & 63], i += s[r << 2 & 63], i += "="), o.push(i), o.join(""); }
                e.byteLength = i, e.toByteArray = o, e.fromByteArray = a;
                for (var s = [], c = [], h = "undefined" != typeof Uint8Array ? Uint8Array : Array, l = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", p = 0, d = l.length; p < d; ++p)
                    s[p] = l[p], c[l.charCodeAt(p)] = p;
                c["-".charCodeAt(0)] = 62, c["_".charCodeAt(0)] = 63;
            }, {}], 31: [function (t, r, e) { function n() { if (!(this instanceof n))
                return new n; } !function (t) { function e(t) { for (var r in s)
                t[r] = s[r]; return t; } function n(t, r) { return u(this, t).push(r), this; } function i(t, r) { function e() { o.call(n, t, e), r.apply(this, arguments); } var n = this; return e.originalListener = r, u(n, t).push(e), n; } function o(t, r) { function e(t) { return t !== r && t.originalListener !== r; } var n, i = this; if (arguments.length) {
                if (r) {
                    if (n = u(i, t, !0)) {
                        if (n = n.filter(e), !n.length)
                            return o.call(i, t);
                        i[a][t] = n;
                    }
                }
                else if (n = i[a], n && (delete n[t], !Object.keys(n).length))
                    return o.call(i);
            }
            else
                delete i[a]; return i; } function f(t, r) { function e(t) { t.call(o); } function n(t) { t.call(o, r); } function i(t) { t.apply(o, s); } var o = this, f = u(o, t, !0); if (!f)
                return !1; var a = arguments.length; if (1 === a)
                f.forEach(e);
            else if (2 === a)
                f.forEach(n);
            else {
                var s = Array.prototype.slice.call(arguments, 1);
                f.forEach(i);
            } return !!f.length; } function u(t, r, e) { if (!e || t[a]) {
                var n = t[a] || (t[a] = {});
                return n[r] || (n[r] = []);
            } } "undefined" != typeof r && (r.exports = t); var a = "listeners", s = { on: n, once: i, off: o, emit: f }; e(t.prototype), t.mixin = e; }(n); }, {}], 32: [function (t, r, e) { e.read = function (t, r, e, n, i) { var o, f, u = 8 * i - n - 1, a = (1 << u) - 1, s = a >> 1, c = -7, h = e ? i - 1 : 0, l = e ? -1 : 1, p = t[r + h]; for (h += l, o = p & (1 << -c) - 1, p >>= -c, c += u; c > 0; o = 256 * o + t[r + h], h += l, c -= 8)
                ; for (f = o & (1 << -c) - 1, o >>= -c, c += n; c > 0; f = 256 * f + t[r + h], h += l, c -= 8)
                ; if (0 === o)
                o = 1 - s;
            else {
                if (o === a)
                    return f ? NaN : (p ? -1 : 1) * (1 / 0);
                f += Math.pow(2, n), o -= s;
            } return (p ? -1 : 1) * f * Math.pow(2, o - n); }, e.write = function (t, r, e, n, i, o) { var f, u, a, s = 8 * o - i - 1, c = (1 << s) - 1, h = c >> 1, l = 23 === i ? Math.pow(2, -24) - Math.pow(2, -77) : 0, p = n ? 0 : o - 1, d = n ? 1 : -1, y = r < 0 || 0 === r && 1 / r < 0 ? 1 : 0; for (r = Math.abs(r), isNaN(r) || r === 1 / 0 ? (u = isNaN(r) ? 1 : 0, f = c) : (f = Math.floor(Math.log(r) / Math.LN2), r * (a = Math.pow(2, -f)) < 1 && (f--, a *= 2), r += f + h >= 1 ? l / a : l * Math.pow(2, 1 - h), r * a >= 2 && (f++, a /= 2), f + h >= c ? (u = 0, f = c) : f + h >= 1 ? (u = (r * a - 1) * Math.pow(2, i), f += h) : (u = r * Math.pow(2, h - 1) * Math.pow(2, i), f = 0)); i >= 8; t[e + p] = 255 & u, p += d, u /= 256, i -= 8)
                ; for (f = f << i | u, s += i; s > 0; t[e + p] = 255 & f, p += d, f /= 256, s -= 8)
                ; t[e + p - d] |= 128 * y; }; }, {}], 33: [function (t, r, e) { (function (Buffer) { var t, r, n, i; !function (e) { function o(t, r, n) { function i(t, r, e, n) { return this instanceof i ? v(this, t, r, e, n) : new i(t, r, e, n); } function o(t) { return !(!t || !t[F]); } function v(t, r, e, n, i) { if (E && A && (r instanceof A && (r = new E(r)), n instanceof A && (n = new E(n))), !(r || e || n || g))
                return void (t.buffer = h(m, 0)); if (!s(r, e)) {
                var o = g || Array;
                i = e, n = r, e = 0, r = new o(8);
            } t.buffer = r, t.offset = e |= 0, b !== typeof n && ("string" == typeof n ? x(r, e, n, i || 10) : s(n, i) ? c(r, e, n, i) : "number" == typeof i ? (k(r, e + T, n), k(r, e + S, i)) : n > 0 ? O(r, e, n) : n < 0 ? L(r, e, n) : c(r, e, m, 0)); } function x(t, r, e, n) { var i = 0, o = e.length, f = 0, u = 0; "-" === e[0] && i++; for (var a = i; i < o;) {
                var s = parseInt(e[i++], n);
                if (!(s >= 0))
                    break;
                u = u * n + s, f = f * n + Math.floor(u / B), u %= B;
            } a && (f = ~f, u ? u = B - u : f++), k(t, r + T, f), k(t, r + S, u); } function P() { var t = this.buffer, r = this.offset, e = _(t, r + T), i = _(t, r + S); return n || (e |= 0), e ? e * B + i : i; } function R(t) { var r = this.buffer, e = this.offset, i = _(r, e + T), o = _(r, e + S), f = "", u = !n && 2147483648 & i; for (u && (i = ~i, o = B - o), t = t || 10;;) {
                var a = i % t * B + o;
                if (i = Math.floor(i / t), o = Math.floor(a / t), f = (a % t).toString(t) + f, !i && !o)
                    break;
            } return u && (f = "-" + f), f; } function k(t, r, e) { t[r + D] = 255 & e, e >>= 8, t[r + C] = 255 & e, e >>= 8, t[r + Y] = 255 & e, e >>= 8, t[r + I] = 255 & e; } function _(t, r) { return t[r + I] * U + (t[r + Y] << 16) + (t[r + C] << 8) + t[r + D]; } var T = r ? 0 : 4, S = r ? 4 : 0, I = r ? 0 : 3, Y = r ? 1 : 2, C = r ? 2 : 1, D = r ? 3 : 0, O = r ? l : d, L = r ? p : y, M = i.prototype, N = "is" + t, F = "_" + N; return M.buffer = void 0, M.offset = 0, M[F] = !0, M.toNumber = P, M.toString = R, M.toJSON = P, M.toArray = f, w && (M.toBuffer = u), E && (M.toArrayBuffer = a), i[N] = o, e[t] = i, i; } function f(t) { var r = this.buffer, e = this.offset; return g = null, t !== !1 && 0 === e && 8 === r.length && x(r) ? r : h(r, e); } function u(t) { var r = this.buffer, e = this.offset; if (g = w, t !== !1 && 0 === e && 8 === r.length && Buffer.isBuffer(r))
                return r; var n = new w(8); return c(n, 0, r, e), n; } function a(t) { var r = this.buffer, e = this.offset, n = r.buffer; if (g = E, t !== !1 && 0 === e && n instanceof A && 8 === n.byteLength)
                return n; var i = new E(8); return c(i, 0, r, e), i.buffer; } function s(t, r) { var e = t && t.length; return r |= 0, e && r + 8 <= e && "string" != typeof t[r]; } function c(t, r, e, n) { r |= 0, n |= 0; for (var i = 0; i < 8; i++)
                t[r++] = 255 & e[n++]; } function h(t, r) { return Array.prototype.slice.call(t, r, r + 8); } function l(t, r, e) { for (var n = r + 8; n > r;)
                t[--n] = 255 & e, e /= 256; } function p(t, r, e) { var n = r + 8; for (e++; n > r;)
                t[--n] = 255 & -e ^ 255, e /= 256; } function d(t, r, e) { for (var n = r + 8; r < n;)
                t[r++] = 255 & e, e /= 256; } function y(t, r, e) { var n = r + 8; for (e++; r < n;)
                t[r++] = 255 & -e ^ 255, e /= 256; } function v(t) { return !!t && "[object Array]" == Object.prototype.toString.call(t); } var g, b = "undefined", w = b !== typeof Buffer && Buffer, E = b !== typeof Uint8Array && Uint8Array, A = b !== typeof ArrayBuffer && ArrayBuffer, m = [0, 0, 0, 0, 0, 0, 0, 0], x = Array.isArray || v, B = 4294967296, U = 16777216; t = o("Uint64BE", !0, !0), r = o("Int64BE", !0, !1), n = o("Uint64LE", !1, !0), i = o("Int64LE", !1, !1); }("object" == typeof e && "string" != typeof e.nodeName ? e : this || {}); }).call(this, t("buffer").Buffer); }, { buffer: 29 }], 34: [function (t, r, e) { var n = {}.toString; r.exports = Array.isArray || function (t) { return "[object Array]" == n.call(t); }; }, {}] }, {}, [1])(1);
});
// This script is a work in progress, not ready for production
// ToDo handle deletion
// ToDo check if we can do undo-ing in a single step
var UranusEditorBlockBuilder = pc.createScript("uranusEditorBlockBuilder");
UranusEditorBlockBuilder.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEditorBlockBuilder.attributes.add("spawnEntity", {
    type: "entity",
    title: "Spawn Entity",
});
UranusEditorBlockBuilder.attributes.add("gridSizeDefault", {
    type: "vec3",
    default: [1, 1, 1],
    title: "Grid Size",
});
UranusEditorBlockBuilder.attributes.add("autoGrid", {
    type: "boolean",
    default: false,
    title: "Auto Grid",
    description: "The grid size on each axis will be calculated based on the total aabb of the spawn entity",
});
UranusEditorBlockBuilder.attributes.add("lockX", {
    type: "boolean",
    default: false,
    title: "Lock X",
});
UranusEditorBlockBuilder.attributes.add("lockY", {
    type: "boolean",
    default: true,
    title: "Lock Y",
});
UranusEditorBlockBuilder.attributes.add("lockZ", {
    type: "boolean",
    default: false,
    title: "Lock Z",
});
UranusEditorBlockBuilder.attributes.add("lockPlanes", {
    type: "vec3",
    default: [0, 0, 0],
    title: "Lock Planes",
});
UranusEditorBlockBuilder.attributes.add("applyLocalOffset", {
    type: "boolean",
    default: false,
    title: "Apply Local Offset",
});
UranusEditorBlockBuilder.attributes.add("allowDuplicates", {
    type: "boolean",
    default: true,
    title: "Allow Duplicates",
});
UranusEditorBlockBuilder.attributes.add("brushDistance", {
    type: "number",
    default: 15,
    title: "Brush Distance",
});
UranusEditorBlockBuilder.prototype.editorInitialize = function () {
    // --- variables
    this.buildButtonState = false;
    this.building = false;
    this.gridSize = new pc.Vec3();
    this.currentCell = new pc.Vec3();
    this.startCoord = new pc.Vec2();
    this.lastCoord = new pc.Vec2();
    this.aabb = new pc.BoundingBox();
    this.brushEntity = undefined;
    this.brushEntityOffset = new pc.Vec3();
    this.parentItem = undefined;
    this.keyUpListener = undefined;
    // --- add custom CSS
    var sheet = window.document.styleSheets[0];
    sheet.insertRule(".active-block-builder-button { background-color: #f60 !important; color: white !important; }", sheet.cssRules.length);
};
// --- editor script methods
UranusEditorBlockBuilder.prototype.editorScriptPanelRender = function (element) {
    var containerEl = element.firstChild;
    // --- bake button the instances as editor items
    var btnBuild = new ui.Button({
        text: "+ Build",
    });
    btnBuild.on("click", function () {
        this.buildButtonState = !this.buildButtonState;
        this.setBuildingState(btnBuild);
    }.bind(this));
    containerEl.append(btnBuild.element);
    this.setBuildingState(btnBuild);
};
UranusEditorBlockBuilder.prototype.editorAttrChange = function (property, value) {
    if (!this.building)
        return;
    if (property === "brushDistance") {
        this.updateSelectedCell();
    }
    if (property === "spawnEntity") {
        this.removeBrushEntity();
        this.addBrushEntity();
        this.updateBrushEntity();
    }
};
UranusEditorBlockBuilder.prototype.setBuildingState = function (btnBuild) {
    if (this.buildButtonState) {
        this.startBuilding();
        btnBuild.element.classList.add("active-block-builder-button");
    }
    else {
        this.stopBuilding();
        btnBuild.element.classList.remove("active-block-builder-button");
    }
};
UranusEditorBlockBuilder.prototype.startBuilding = function () {
    if (this.building === true || !this.spawnEntity)
        return;
    this.building = true;
    Uranus.Editor.editorPickerState(false);
    // --- keep track of the parent holder item
    var items = editor.call("selector:items");
    this.parentItem = items[0];
    // --- enable input handlers
    this.setInputState(true);
    // --- calculate the size of the working grid
    this.calculateGridSize();
    // --- enable the brush entity
    this.addBrushEntity();
};
UranusEditorBlockBuilder.prototype.stopBuilding = function () {
    if (this.building === false)
        return;
    this.building = false;
    Uranus.Editor.editorPickerState(true);
    // --- disable input handlers
    this.setInputState(false);
    // --- remove brush
    this.removeBrushEntity();
};
UranusEditorBlockBuilder.prototype.setInputState = function (state) {
    if (state === true) {
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        this.keyUpListener = this.onKeyUp.bind(this);
        window.addEventListener("keyup", this.keyUpListener, true);
    }
    else {
        this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        window.removeEventListener("keyup", this.keyUpListener, true);
    }
};
UranusEditorBlockBuilder.prototype.onMouseDown = function (e) {
    this.startCoord.set(e.x, e.y);
};
UranusEditorBlockBuilder.prototype.onMouseMove = function (e) {
    if (this.building === false) {
        return false;
    }
    this.lastCoord.set(e.x, e.y);
    this.updateSelectedCell();
};
UranusEditorBlockBuilder.prototype.onKeyUp = function (e) {
    switch (e.keyCode) {
        case pc.KEY_R:
            this.rotateBrushEntity();
            break;
    }
};
UranusEditorBlockBuilder.prototype.onMouseUp = function (e) {
    if (e.altKey === true) {
        // --- handle options keys
        if (event.button === pc.MOUSEBUTTON_LEFT) {
            this.brushDistance += this.gridSize.x;
        }
        else if (event.button === pc.MOUSEBUTTON_RIGHT) {
            this.brushDistance -= this.gridSize.x;
            if (this.brushDistance <= 0) {
                this.brushDistance = this.gridSize.x;
            }
        }
        return;
    }
    // --- check if cursor has moved, that means the camera has moved
    // --- if that's the case we shouldn't be spawning
    if (this.startCoord.x !== this.lastCoord.x ||
        this.lastCoord.y !== this.lastCoord.y) {
        return false;
    }
    this.spawnEntityInCell();
};
UranusEditorBlockBuilder.prototype.buildAabb = function (entity, modelsAdded) {
    var i = 0;
    if (entity.model && entity.model.meshInstances) {
        var mi = entity.model.meshInstances;
        for (i = 0; i < mi.length; i++) {
            if (!modelsAdded) {
                this.aabb.copy(mi[i].aabb);
            }
            else {
                this.aabb.add(mi[i].aabb);
            }
            modelsAdded += 1;
        }
    }
    for (i = 0; i < entity.children.length; ++i) {
        modelsAdded += this.buildAabb(entity.children[i], modelsAdded);
    }
    return modelsAdded;
};
UranusEditorBlockBuilder.prototype.calculateGridSize = function () {
    if (this.autoGrid) {
        // --- calculate the total AABB of the spawn entity
        this.buildAabb(this.spawnEntity);
        this.gridSize.copy(this.aabb.halfExtents).scale(2);
        return this.gridSize;
    }
    else {
        return this.gridSize.copy(this.gridSizeDefault);
    }
};
UranusEditorBlockBuilder.prototype.updateSelectedCell = function () {
    this.camera = editor.call("camera:current");
    // --- get world pos under the camera cursor
    this.camera.camera.screenToWorld(this.lastCoord.x, this.lastCoord.y, this.brushDistance, this.currentCell);
    // --- check locked axises
    if (this.lockX) {
        this.currentCell.x = this.lockPlanes.x;
    }
    if (this.lockY) {
        this.currentCell.y = this.lockPlanes.y;
    }
    if (this.lockZ) {
        this.currentCell.z = this.lockPlanes.z;
    }
    // --- convert to grid pos
    this.currentCell.x =
        Math.floor(this.currentCell.x / this.gridSize.x) * this.gridSize.x;
    this.currentCell.y =
        Math.floor(this.currentCell.y / this.gridSize.y) * this.gridSize.y;
    this.currentCell.z =
        Math.floor(this.currentCell.z / this.gridSize.z) * this.gridSize.z;
    // --- update brush
    this.updateBrushEntity();
};
UranusEditorBlockBuilder.prototype.getCellGuid = function () {
    return (this.currentCell.x.toFixed(3) +
        "_" +
        this.currentCell.y.toFixed(3) +
        "_" +
        this.currentCell.z.toFixed(3));
};
UranusEditorBlockBuilder.prototype.addBrushEntity = function () {
    if (this.brushEntity)
        return;
    this.brushEntity = this.spawnEntity.clone();
    this.app.root.addChild(this.brushEntity);
    this.brushEntityOffset.copy(this.spawnEntity.getLocalPosition());
    Uranus.Editor.setEntityModelOutline(this.brushEntity, true);
};
UranusEditorBlockBuilder.prototype.updateBrushEntity = function () {
    if (!this.brushEntity)
        return;
    this.brushEntity.setPosition(this.currentCell);
    if (this.applyLocalOffset) {
        this.brushEntity.translate(this.brushEntityOffset);
    }
};
UranusEditorBlockBuilder.prototype.rotateBrushEntity = function () {
    if (!this.brushEntity)
        return;
    this.brushEntity.rotate(0, -45, 0);
};
UranusEditorBlockBuilder.prototype.removeBrushEntity = function () {
    if (!this.brushEntity)
        return;
    this.brushEntity.destroy();
    Uranus.Editor.setEntityModelOutline(this.brushEntity, false);
    this.brushEntity = undefined;
};
UranusEditorBlockBuilder.prototype.spawnEntityInCell = function () {
    if (!this.parentItem) {
        return false;
    }
    // --- check if we have already spawned an entity on this grid cell
    var cellGuid = this.getCellGuid();
    var cellTag = "cell_" + cellGuid;
    if (this.allowDuplicates === false) {
        var found = false;
        var children = this.parentItem.get("children");
        for (var i = 0; i < children.length; i++) {
            var child = editor.call("entities:get", children[i]);
            if (child.get("tags").indexOf(cellTag) > -1) {
                found = true;
                break;
            }
        }
        if (found) {
            return false;
        }
    }
    // --- parent item to add new items
    var bankItem = editor.call("entities:get", this.spawnEntity._guid);
    if (!bankItem) {
        return false;
    }
    var newItem = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
    var tags = newItem.get("tags");
    tags.push(cellTag);
    newItem.set("tags", tags);
    // calculate local position from world position
    var localPosition = this.brushEntity.getLocalPosition();
    var angles = this.brushEntity.getLocalEulerAngles();
    var scale = this.brushEntity.getLocalScale();
    newItem.history.enabled = false;
    newItem.set("enabled", true);
    newItem.set("position", [localPosition.x, localPosition.y, localPosition.z]);
    newItem.set("rotation", [angles.x, angles.y, angles.z]);
    newItem.set("scale", [scale.x, scale.y, scale.z]);
    newItem.history.enabled = true;
    Uranus.Editor.interface.logMessage('Block builder spawned child for <strong style="color: cyan;">' +
        this.entity.name +
        "</strong>");
};
// --- dependencies
// UPNG.js
// ----------------
var UranusEditorEntitiesDistribute = pc.createScript("uranusEditorEntitiesDistribute");
UranusEditorEntitiesDistribute.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEditorEntitiesDistribute.attributes.add("distributeMap", {
    type: "asset",
    assetType: "texture",
    title: "Distribution Map",
});
UranusEditorEntitiesDistribute.attributes.add("terrainChannel", {
    type: "number",
    title: "Channel",
    default: 0,
    enum: [{ R: 0 }, { G: 1 }, { B: 2 }, { A: 3 }],
});
UranusEditorEntitiesDistribute.attributes.add("terrainWidth", {
    type: "number",
    default: 100,
    title: "Terrain Width",
});
UranusEditorEntitiesDistribute.attributes.add("terrainDepth", {
    type: "number",
    default: 100,
    title: "Terrain Depth",
});
UranusEditorEntitiesDistribute.attributes.add("minHeight", {
    type: "number",
    default: 0,
    title: "Min Height",
});
UranusEditorEntitiesDistribute.attributes.add("bank", {
    type: "entity",
    title: "Bank",
    description: "If a terrain is provided, you must provide a bank/entity with children entities to be used as templates for instancing.",
});
UranusEditorEntitiesDistribute.attributes.add("terrainSampleDist", {
    type: "number",
    default: 10,
    min: 0,
    title: "Sample Dist",
    description: "This is the distance in world units for which a point will be sampled from the splatmaps. Be careful a small value can produce a very high number of instances.",
});
UranusEditorEntitiesDistribute.attributes.add("terrainSampleOffset", {
    type: "number",
    default: 0.5,
    min: 0.1,
    max: 1,
    title: "Sample Offset",
    description: "This determines how definitive the splatmap color has to be to allow instances to be placed.",
});
UranusEditorEntitiesDistribute.attributes.add("onEvent", {
    type: "string",
    title: "On Event",
    description: "You can provide an event name that when globally fired the generation of the instances will start, instead of doing it inside the entity initialize method.",
});
UranusEditorEntitiesDistribute.attributes.add("brushRadius", {
    type: "number",
    title: "Dense Radius",
    min: 0.0,
    description: "If a value larger than 0 is provided the algorithm will spawn additional instances in a circle around the instance point.",
});
UranusEditorEntitiesDistribute.attributes.add("itemsNo", {
    type: "number",
    title: "Items No",
    min: 1.0,
    description: "The number of items will be spawned per instance if a dense radius is provided.",
});
UranusEditorEntitiesDistribute.attributes.add("brushAngle", {
    type: "number",
    title: "Rotate?",
    enum: [
        { "Don't rotate": 0 },
        { "X Axis": 1 },
        { "Y Axis": 2 },
        { "Z Axis": 3 },
    ],
});
UranusEditorEntitiesDistribute.attributes.add("brushScale", {
    type: "vec2",
    title: "Scale min/max",
    placeholder: ["Min", "Max"],
    description: "If a dense radius is provided use scale min/max to add a random scale factor to each spawned instance.",
});
UranusEditorEntitiesDistribute.attributes.add("runBatcher", {
    type: "boolean",
    default: true,
    title: "Run Batcher",
});
// this is an editor only script
UranusEditorEntitiesDistribute.prototype.editorInitialize = function (manualRun) {
    if (!this.inEditor)
        return;
    this.running = false;
    // --- check if we already have children, so don't automatically run again
    if (this.entity.children.length > 0) {
        if (this.runBatcher === true) {
            this.executeBatcher();
        }
    }
    else {
        if (!manualRun && this.onEvent) {
            this.app.once(this.onEvent, this.initiate, this);
        }
        else {
            this.initiate();
        }
    }
};
UranusEditorEntitiesDistribute.prototype.initiate = function () {
    // --- variables
    this.vec = new pc.Vec3();
    this.vec1 = new pc.Vec3();
    this.vec2 = new pc.Vec3();
    this.vec3 = new pc.Vec3();
    this.nodes = undefined;
    this.batchGroups = undefined;
    this.running = true;
    // --- execute
    if (this.distributeMap) {
        // --- variables
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.prepareMap()
            .then(function (instances) {
            this.spawnInstances(instances);
            this.running = false;
            // --- manually run the batcher in editor to increase performance
            if (this.runBatcher === true) {
                this.executeBatcher();
            }
        }.bind(this))
            .catch(function () {
            this.running = false;
        });
    }
    // --- events
    this.on("destroy", this.onDestroy, this);
};
UranusEditorEntitiesDistribute.prototype.onDestroy = function () {
    if (this.nodes) {
        this.nodes.forEach(function (node) {
            node.entity.destroy();
        });
        this.nodes = undefined;
    }
    this.clearBatches();
};
UranusEditorEntitiesDistribute.prototype.prepareMap = function () {
    return new Promise(function (resolve, reject) {
        var textureUrl = this.distributeMap.getFileUrl();
        pc.http.get(textureUrl, {
            responseType: "arraybuffer",
        }, function (err, response) {
            if (!response)
                return;
            var image = UPNG.decode(response);
            var i, j;
            var points = [];
            var center = this.entity.getPosition();
            var pixels = image.data;
            var offset = this.terrainSampleOffset * 255;
            var samplesCount = 0;
            var nextDist = pc.math.random(this.terrainSampleDist * 0.5, this.terrainSampleDist * 1.5);
            for (i = 0; i < pixels.length; i += 4) {
                if (pixels[i + this.terrainChannel] >= offset) {
                    var x = ((i / 4) % image.width) / image.width;
                    var z = Math.floor(i / 4 / image.width) / image.width;
                    x *= this.terrainWidth;
                    z *= this.terrainDepth;
                    z = this.terrainDepth - z;
                    x += center.x - this.terrainWidth / 2;
                    z += center.z - this.terrainDepth / 2;
                    // --- check if we reached the sample distance
                    if (samplesCount > nextDist) {
                        samplesCount = 0;
                        nextDist = pc.math.random(this.terrainSampleDist * 0.5, this.terrainSampleDist * 1.5);
                        points.push([x, z]);
                    }
                    samplesCount++;
                }
            }
            // --- and assemble instances from terrain positions buffer
            var instances = [];
            for (var i_1 = 0; i_1 < points.length; i_1++) {
                var point = points[i_1];
                var x = point[0];
                var z = point[1];
                // --- get height at point
                this.vec2.set(x, 10000, z);
                this.vec3.set(x, -10000, z);
                var result = this.app.systems.rigidbody.raycastFirst(this.vec2, this.vec3);
                if (!result)
                    continue;
                var height = result.point.y;
                if (height >= this.minHeight) {
                    var bank = this.bank.children;
                    var bankIndex = Math.floor(Math.random() * bank.length);
                    // --- random rotation
                    this.vec.set(0, 0, 0);
                    this.setRandomRotation(this.vec, this.brushAngle);
                    // --- random scale
                    var newScaleFactor = pc.math.random(this.brushScale.x, this.brushScale.y);
                    instances.push([
                        bankIndex,
                        x,
                        height,
                        z,
                        this.vec.x,
                        this.vec.y,
                        this.vec.z,
                        newScaleFactor,
                    ]);
                }
            }
            resolve(instances);
        }.bind(this));
    }.bind(this));
};
UranusEditorEntitiesDistribute.prototype.condenseInstances = function (instances) {
    instances.forEach(function (instance) {
        for (var i = 1; i <= this.itemsNo; i++) {
            var a = Math.random();
            var b = Math.random();
            var instancePos = this.vec.set(instance[1], instance[2], instance[3]);
            this.vec1.x =
                instancePos.x +
                    b * this.brushRadius * Math.cos((2 * Math.PI * a) / b);
            this.vec1.z =
                instancePos.z +
                    b * this.brushRadius * Math.sin((2 * Math.PI * a) / b);
            // --- get elevation under the point
            this.vec2.set(this.vec1.x, 10000, this.vec1.z);
            this.vec3.set(this.vec1.x, -10000, this.vec1.z);
            var result = this.app.systems.rigidbody.raycastFirst(this.vec2, this.vec3);
            if (result) {
                this.vec1.y = result.point.y;
            }
            else {
                this.vec1.y = instancePos.y;
            }
            // --- rotate them
            this.vec2.set(instance[4], instance[5], instance[6]);
            this.setRandomRotation(this.vec2, this.brushAngle);
            // --- scale them up
            var newScaleFactor = pc.math.random(this.brushScale.x, this.brushScale.y);
            // --- add a new instance to the instances array
            instances.push([
                instance[0],
                this.vec1.x,
                this.vec1.y,
                this.vec1.z,
                this.vec2.x,
                this.vec2.y,
                this.vec2.z,
                newScaleFactor,
            ]);
        }
    }.bind(this));
};
UranusEditorEntitiesDistribute.prototype.spawnInstances = function (instances) {
    var parent = this.entity;
    // --- check if we are condensing
    if (this.brushRadius > 0) {
        this.condenseInstances(instances);
    }
    this.nodes = [];
    instances.forEach(function (instance, index) {
        var parentBank = this.bank.children;
        var bank = parentBank ? parentBank[instance[0]] : this.bank;
        var node = bank.clone();
        parent.addChild(node);
        this.nodes.push({
            bank: bank,
            entity: node,
        });
        var instancePos = this.vec.set(instance[1], instance[2], instance[3]);
        var instanceAngles = this.vec1.set(instance[4], instance[5], instance[6]);
        node.setPosition(instancePos);
        node.setEulerAngles(instanceAngles);
        node.rotateLocal(bank.getLocalEulerAngles());
        this.vec3.copy(bank.getLocalScale());
        this.vec3.scale(instance[7]);
        node.setLocalScale(this.vec3.x, this.vec3.y, this.vec3.z);
        node.enabled = true;
    }.bind(this));
    console.log("Spawned " + this.entity.name + " " + instances.length + " instances.");
};
UranusEditorEntitiesDistribute.prototype.setRandomRotation = function (vec, axis, single) {
    switch (axis) {
        case 1:
            vec.x = pc.math.random(0, 360);
            if (single) {
                vec.y = 0;
                vec.z = 0;
            }
            break;
        case 2:
            vec.y = pc.math.random(0, 360);
            if (single) {
                vec.x = 0;
                vec.z = 0;
            }
            break;
        case 3:
            vec.z = pc.math.random(0, 360);
            if (single) {
                vec.x = 0;
                vec.y = 0;
            }
            break;
    }
};
// --- editor script methods
UranusEditorEntitiesDistribute.prototype.editorScriptPanelRender = function (element) {
    var containerEl = element.firstChild;
    // --- bake button the instances as editor items
    var btnAdd = new ui.Button({
        text: "+ Bake Instances",
    });
    btnAdd.on("click", this.bakeInstancesInEditor.bind(this));
    containerEl.append(btnAdd.element);
    // --- clear button for removing all entity children
    var btnClearInstances = new ui.Button({
        text: "- Clear Instances",
    });
    btnClearInstances.on("click", this.clearEditorInstances.bind(this));
    containerEl.append(btnClearInstances.element);
};
UranusEditorEntitiesDistribute.prototype.executeBatcher = function () {
    if (this.runBatcher === true) {
        this.batchGroups = Uranus.Editor.runBatcher(this.entity.children);
    }
    else {
        this.clearBatches();
    }
};
UranusEditorEntitiesDistribute.prototype.clearBatches = function () {
    if (this.batchGroups) {
        // --- enable entity model component
        var modelComps = this.entity.findComponents("model");
        modelComps.forEach(function (model) {
            if (model.batchGroupId > -1) {
                model.addModelToLayers();
            }
        });
        // --- clear batched entities
        var batchList = this.app.batcher._batchList;
        for (var i = 0; i < batchList.length; i++) {
            if (this.batchGroups.indexOf(batchList[i].batchGroupId) > -1) {
                this.app.batcher.destroy(batchList[i]);
            }
        }
    }
    this.batchGroups = undefined;
};
UranusEditorEntitiesDistribute.prototype.bakeInstancesInEditor = function () {
    if (!this.nodes || this.nodes.length === 0) {
        return;
    }
    var type = editor.call("selector:type");
    if (type !== "entity") {
        return false;
    }
    var items = editor.call("selector:items");
    if (!items || items.length === 0) {
        return false;
    }
    // --- parent item to add new items
    var parentItem = items[0];
    this.nodes.forEach(function (node) {
        var entity = node.entity;
        var bankItem = editor.call("entities:get", node.bank._guid);
        var newItem = Uranus.Editor.duplicateEntity(bankItem, parentItem);
        // calculate local position from world position
        var localPosition = entity.getLocalPosition();
        var angles = entity.getLocalEulerAngles();
        var scale = entity.getLocalScale();
        newItem.set("enabled", true);
        newItem.set("position", [
            localPosition.x,
            localPosition.y,
            localPosition.z,
        ]);
        newItem.set("rotation", [angles.x, angles.y, angles.z]);
        newItem.set("scale", [scale.x, scale.y, scale.z]);
        // destroy the app only entity
        entity.destroy();
    });
    this.nodes = undefined;
    // --- first we clear any batches on the internal entities
    this.clearBatches();
    // --- then we execute the batcher once more for the new entities
    this.executeBatcher();
};
UranusEditorEntitiesDistribute.prototype.clearEditorInstances = function () {
    var items = editor.call("selector:items");
    if (!items || items.length === 0) {
        return false;
    }
    // --- parent item to add new items
    var parentItem = items[0];
    parentItem.get("children").forEach(function (guid) {
        var item = editor.call("entities:get", guid);
        if (item) {
            editor.call("entities:removeEntity", item);
        }
    });
};
UranusEditorEntitiesDistribute.prototype.editorAttrChange = function (property, value) {
    if (this.running === true)
        return;
    if (property === "runBatcher") {
        this.executeBatcher();
        return;
    }
    this.onDestroy();
    if (this.inEditor === true) {
        this.editorInitialize(true);
    }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// --- dependencies
// msgpack.js
// ----------------
// ToDo don't remove model component if not explicitely added
var UranusEditorEntitiesPaint = pc.createScript("uranusEditorEntitiesPaint");
UranusEditorEntitiesPaint.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEditorEntitiesPaint.attributes.add("spawnEntity", {
    type: "entity",
    title: "Spawn Entity",
});
UranusEditorEntitiesPaint.attributes.add("itemsPerStroke", {
    type: "number",
    default: 1,
    title: "Items Per Stroke",
});
UranusEditorEntitiesPaint.attributes.add("brushDistance", {
    type: "number",
    default: 10,
    min: 0.01,
    title: "Brush Distance",
});
UranusEditorEntitiesPaint.attributes.add("brushRadius", {
    type: "number",
    default: 10,
    min: 0.01,
    title: "Brush Radius",
});
UranusEditorEntitiesPaint.attributes.add("scaleMinMax", {
    type: "vec2",
    default: [0.8, 1.2],
    title: "Scale Min/Max",
});
UranusEditorEntitiesPaint.attributes.add("posOffset", {
    type: "vec3",
    default: [0.0, 0.0, 0.0],
    title: "Pos Offset",
});
UranusEditorEntitiesPaint.attributes.add("projectOffset", {
    type: "boolean",
    default: true,
    title: "Project Offset",
    description: "If enabled the offset will be projected to the final calculated scale of the instance.",
});
UranusEditorEntitiesPaint.attributes.add("rotateThem", {
    type: "string",
    enum: [
        { None: "none" },
        { "X axis": "x" },
        { "Y axis": "y" },
        { "Z axis": "z" },
    ],
    default: "y",
    title: "Rotate Them",
});
UranusEditorEntitiesPaint.attributes.add("alignThem", {
    type: "boolean",
    default: false,
    title: "Align To Surface",
});
UranusEditorEntitiesPaint.attributes.add("removeComponents", {
    type: "string",
    default: "model",
    title: "Remove Components",
    description: "A comma separated list of entity compoments to be removed when spawning an instance. When using HW instancing the model component should be removed.",
});
UranusEditorEntitiesPaint.attributes.add("streamingFile", {
    type: "asset",
    title: "Streaming File",
    description: "If a json or binary asset file is provided, instead of spawning new entities in the hierarchy, all translation info will be saved to the file. This is ideal when spawning a huge number of static instances.",
});
UranusEditorEntitiesPaint.attributes.add("streamingPrecision", {
    type: "number",
    default: 1e3,
    title: "Streaming Precision",
    description: "Less digits provide smaller precision but also smaller file sizes",
});
UranusEditorEntitiesPaint.attributes.add("playcanvasToken", {
    type: "string",
    title: "Playcanvas Token",
    description: "A valid Playcanvas Rest API access token to be used for updating the streaming file.",
});
UranusEditorEntitiesPaint.attributes.add("hardwareInstancing", {
    type: "boolean",
    default: false,
    title: "Hardware Instancing",
});
UranusEditorEntitiesPaint.attributes.add("cullingCamera", {
    type: "entity",
    title: "Culling Camera",
});
UranusEditorEntitiesPaint.attributes.add("cellSize", {
    type: "vec3",
    default: [10, 10, 10],
    title: "Cell Size",
});
UranusEditorEntitiesPaint.attributes.add("hideAfter", {
    type: "number",
    default: 0,
    title: "Far Clip",
    description: "Cull the instance after a distance from camera. Set to 0 to disable.",
});
UranusEditorEntitiesPaint.attributes.add("perInstanceCull", {
    type: "boolean",
    default: true,
    title: "Per Instance Cull",
    description: "If enabled instances will be culled based only on the visibility of their current cell. This is a great way to increase performance when a huge number of instances is parsed.",
});
UranusEditorEntitiesPaint.attributes.add("useLOD", {
    type: "boolean",
    default: false,
    title: "Use LOD",
    description: "A LOD system that works only when HW instancing is enabled. All LOD levels should be added as a first level entity to the spawn instance, with a model component and the 'uranus-lod-entity' tag.",
});
UranusEditorEntitiesPaint.attributes.add("lodLevels", {
    type: "vec3",
    default: [30, 50, 70],
    title: "LOD Levels",
});
UranusEditorEntitiesPaint.attributes.add("lodThreshold", {
    type: "number",
    default: 0.9,
    title: "LOD Threshold",
    description: "The amount of distance range where two LODs can overlap. Useful when doing LOD fade in/out effects.",
});
UranusEditorEntitiesPaint.attributes.add("isStatic", {
    type: "boolean",
    default: false,
    title: "Is Static",
    description: "When hardware instancing is enabled, checking this flag will provide a performance increase since no translations will be updated on runtime. It requires a culling camera to be referenced and Per Intance Cull to be enabled.",
});
UranusEditorEntitiesPaint.attributes.add("densityReduce", {
    type: "number",
    default: 0,
    title: "Density Reduce",
    min: 0,
    precision: 0,
    description: "Number of instances to be skipped for each instance rendered, useful to increase the performance in lower end devices.",
});
UranusEditorEntitiesPaint.attributes.add("densityIncrease", {
    type: "number",
    default: 0,
    title: "Density Increase",
    min: 0,
    precision: 0,
    description: "Number of instances to be randomnly added for each data instance, useful to increase complexity without massive data sets. Works only when streaming data.",
});
UranusEditorEntitiesPaint.attributes.add("densityIncreaseRadius", {
    type: "number",
    default: 0,
    title: "Density Increase Radius",
    description: "The radius at which to spawn a random instance using the data instance as center.",
});
UranusEditorEntitiesPaint.attributes.add("densityIncreaseRaycast", {
    type: "boolean",
    default: true,
    title: "Density Increase Raycast",
    description: "If set to true a physics raycast will be cast to get the Y pos with accuracy, otherwise the same height will be used.",
});
UranusEditorEntitiesPaint.zeroBuffer = new Float32Array();
UranusEditorEntitiesPaint.prototype.initialize = function () {
    this.vec = new pc.Vec3();
    this.vec1 = new pc.Vec3();
    this.vec2 = new pc.Vec3();
    this.vec3 = new pc.Vec3();
    this.vec4 = new pc.Vec3();
    this.vec5 = new pc.Vec3();
    this.quat = new pc.Quat();
    this.matrix = new pc.Mat4();
    this.randomPosition = new pc.Vec3();
    this.vecOne = new pc.Vec3(1, 1, 1);
    this.tempSphere = { center: null, radius: 0.5 };
    this.lodDistance = [
        this.lodLevels.x * this.lodLevels.x,
        this.lodLevels.y * this.lodLevels.y,
        this.lodLevels.z * this.lodLevels.z,
    ];
    this.lodDistanceRaw = [
        this.lodLevels.x,
        this.lodLevels.y,
        this.lodLevels.z,
        this.hideAfter,
    ];
    this.spawnEntities = [];
    this.meshInstances = undefined;
    this.instanceData = {
        name: undefined,
        position: new pc.Vec3(),
        rotation: new pc.Quat(),
        scale: new pc.Vec3(),
    };
    this.hiddenCamera = this.cullingCamera
        ? this.cullingCamera.clone()
        : undefined;
    if (this.hideAfter > 0 && this.hiddenCamera) {
        this.hiddenCamera.camera.farClip = this.hideAfter;
        this.cells = undefined;
    }
    // --- load first any streaming data available
    this.hwReady = false;
    this.loadStreamingData(this.streamingFile).then(function (streamingData) {
        this.streamingData = streamingData;
        this.hwReady = true;
        if (this.hardwareInstancing) {
            // const p1 = performance.now();
            this.prepareHardwareInstancing();
            // const p2 = performance.now();
            // const diff = p2 - p1;
            // console.log(this.entity.name, diff.toFixed(2));
        }
    }.bind(this));
    // --- events
    if (Uranus.Editor.inEditor() === false) {
        this.on("attr", this.editorAttrChange, this);
    }
    this.on("state", function (enabled) {
        if (!this.hwReady) {
            return false;
        }
        if (this.hardwareInstancing) {
            if (enabled) {
                this.prepareHardwareInstancing();
            }
            else {
                this.clearInstances();
            }
        }
    }, this);
};
UranusEditorEntitiesPaint.prototype.update = function (dt) {
    if (this.hardwareInstancing) {
        //const p1 = performance.now();
        this.cullHardwareInstancing();
        // const p2 = performance.now();
        // const diff = p2 - p1;
        // console.log(diff.toFixed(2));
    }
};
UranusEditorEntitiesPaint.prototype.editorInitialize = function () {
    // --- variables
    this.buildButtonState = false;
    this.eraseButtonState = false;
    this.building = false;
    this.mouseDown = false;
    this.currentPosition = new pc.Vec3();
    this.randomPosition = new pc.Vec3();
    this.lastPosition = new pc.Vec3();
    this.x = new pc.Vec3();
    this.y = new pc.Vec3();
    this.z = new pc.Vec3();
    this.parentItem = undefined;
    this.keyUpListener = undefined;
    // --- gizmo material
    this.gizmoMaterial = new pc.StandardMaterial();
    this.gizmoMaterial.blendType = pc.BLEND_NORMAL;
    this.gizmoMaterial.emissive = new pc.Vec3(1, 1, 1);
    this.gizmoMaterial.emissiveInstensity = 10;
    this.gizmoMaterial.opacity = 0.25;
    this.gizmoMaterial.useLighting = false;
    this.gizmoMaterial.update();
    // --- prepare components to remove
    this.prepareComponentsToClear(this.removeComponents);
    // --- add custom CSS
    var sheet = window.document.styleSheets[0];
    sheet.insertRule(".active-entities-painter-button { background-color: #f60 !important; color: white !important; }", sheet.cssRules.length);
};
UranusEditorEntitiesPaint.prototype.prepareComponentsToClear = function (value) {
    this.componentsToClear = [];
    if (value && value.length > 0) {
        value
            .replace(/\s+/, "")
            .split(",")
            .forEach(function (componentName) {
            this.componentsToClear.push(componentName);
        }.bind(this));
    }
};
// --- editor script methods
UranusEditorEntitiesPaint.prototype.editorScriptPanelRender = function (element) {
    var containerEl = element.firstChild;
    // --- bake button the instances as editor items
    var btnBuild = new ui.Button({
        text: "+ Paint",
    });
    btnBuild.on("click", function () {
        if (this.eraseButtonState === true) {
            this.eraseButtonState = false;
            this.setEraseState(btnErase);
        }
        this.buildButtonState = !this.buildButtonState;
        this.setBuildingState(btnBuild);
    }.bind(this));
    containerEl.append(btnBuild.element);
    this.setBuildingState(btnBuild, true);
    var btnErase = new ui.Button({
        text: "- Erase",
    });
    btnErase.on("click", function () {
        if (this.buildButtonState === true) {
            this.buildButtonState = false;
            this.setBuildingState(btnBuild);
        }
        this.eraseButtonState = !this.eraseButtonState;
        this.setEraseState(btnErase);
    }.bind(this));
    containerEl.append(btnErase.element);
    this.setEraseState(btnErase, true);
    // --- update HW instances button
    var btnUpdateInstances = new ui.Button({
        text: "+ Update HW Instances",
    });
    btnUpdateInstances.on("click", this.prepareHardwareInstancing.bind(this));
    containerEl.append(btnUpdateInstances.element);
    // --- spawn binary asset
    var btnCreateBinary = new ui.Button({
        text: "+ Add Binary Asset",
    });
    btnCreateBinary.on("click", function () {
        editor.call("assets:create", {
            type: "binary",
            name: this.entity.name + " Binary",
            preload: true,
            file: new Blob(["[]"], { type: "application/octet-stream" }),
        });
    }.bind(this));
    containerEl.append(btnCreateBinary.element);
    // --- clear button for removing all entity children
    var btnClearInstances = new ui.Button({
        text: "- Clear All Instances",
    });
    btnClearInstances.on("click", this.clearEditorInstances.bind(this));
    containerEl.append(btnClearInstances.element);
};
UranusEditorEntitiesPaint.prototype.editorAttrChange = function (property, value) {
    if (Uranus.Editor.inEditor()) {
        if (this.building) {
            this.setGizmoState(false);
            this.setGizmoState(true);
        }
        if (property === "removeComponents") {
            this.prepareComponentsToClear(value);
        }
    }
    if (property === "streamingFile") {
        this.loadStreamingData(value).then(function (data) {
            this.streamingData = data;
            this.prepareHardwareInstancing();
        }.bind(this));
    }
    if (property === "hardwareInstancing") {
        this.prepareHardwareInstancing();
    }
    if (this.cullingCamera && property === "hideAfter") {
        var hideAfter = value;
        this.hiddenCamera.camera.farClip =
            hideAfter > 0 ? hideAfter : this.cullingCamera.camera.farClip;
        this.lodDistanceRaw[3] = value;
        if (this.hardwareInstancing) {
            this.prepareHardwareInstancing();
        }
    }
    if (property === "lodLevels") {
        this.lodDistance = [
            value.x * value.x,
            value.y * value.y,
            value.z * value.z,
        ];
        this.lodDistanceRaw = [value.x, value.y, value.z, this.hideAfter];
    }
};
UranusEditorEntitiesPaint.prototype.setBuildingState = function (btnBuild, dontTrigger) {
    if (this.buildButtonState) {
        if (!dontTrigger)
            this.startBuilding();
        btnBuild.element.classList.add("active-entities-painter-button");
    }
    else {
        if (!dontTrigger)
            this.stopBuilding();
        btnBuild.element.classList.remove("active-entities-painter-button");
    }
};
UranusEditorEntitiesPaint.prototype.setEraseState = function (btnErase, dontTrigger) {
    if (this.eraseButtonState) {
        if (!dontTrigger)
            this.startBuilding();
        btnErase.element.classList.add("active-entities-painter-button");
    }
    else {
        if (!dontTrigger)
            this.stopBuilding();
        btnErase.element.classList.remove("active-entities-painter-button");
    }
};
UranusEditorEntitiesPaint.prototype.startBuilding = function () {
    if (this.building === true || !this.spawnEntity)
        return;
    this.building = true;
    Uranus.Editor.editorPickerState(false);
    // --- keep track of the parent holder item
    var items = editor.call("selector:items");
    this.parentItem = items[0];
    // --- enable input handlers
    this.setInputState(true);
    // --- enable gizmo
    this.setGizmoState(true);
    // --- clear history to allow undo/redo to work without selecting a different entity
    var history = editor.call("editor:history");
    history.clear();
};
UranusEditorEntitiesPaint.prototype.stopBuilding = function () {
    if (this.building === false)
        return;
    this.building = false;
    Uranus.Editor.editorPickerState(true);
    // --- disable input handlers
    this.setInputState(false);
    // --- disable gizmo
    this.setGizmoState(false);
    // --- if we are streaming the data, update the file
    if (this.streamingFile) {
        this.saveStreamingData();
    }
};
UranusEditorEntitiesPaint.prototype.setGizmoState = function (state) {
    if (state === true) {
        this.gizmo = new pc.Entity("Gizmo Sphere");
        this.gizmo.addComponent("model", {
            type: "sphere",
            castShadows: false,
            receiveShadows: false,
        });
        this.gizmo.model.material = this.gizmoMaterial;
        this.gizmo.setLocalScale(this.brushDistance * 2, this.brushDistance * 2, this.brushDistance * 2);
        this.app.root.addChild(this.gizmo);
    }
    else {
        if (this.gizmo) {
            this.gizmo.destroy();
        }
    }
};
UranusEditorEntitiesPaint.prototype.setInputState = function (state) {
    var history = editor.call("editor:history");
    if (state === true) {
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        this.historyUndoRef = this.onHistoryUndo.bind(this);
        this.historyRedoRef = this.onHistoryRedo.bind(this);
        history.on("undo", this.historyUndoRef);
        history.on("redo", this.historyRedoRef);
    }
    else {
        this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        history.unbind("undo", this.historyUndoRef);
        history.unbind("redo", this.historyRedoRef);
    }
};
UranusEditorEntitiesPaint.prototype.onHistoryUndo = function () {
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.prepareHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.onHistoryRedo = function () {
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.prepareHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.onMouseDown = function (e) {
    if (e.button !== pc.MOUSEBUTTON_LEFT) {
        return false;
    }
    // ToDo make it an Uranus.Editor method
    editor.emit("camera:toggle", false);
    this.mouseDown = true;
    this.lastPosition.set(Infinity, Infinity, Infinity);
};
UranusEditorEntitiesPaint.prototype.onMouseMove = function (e) {
    if (this.building === false || this.mouseDown === false) {
        return false;
    }
    this.parseMousePoint(e.x, e.y);
};
UranusEditorEntitiesPaint.prototype.onKeyUp = function (e) {
    switch (e.keyCode) {
        case pc.KEY_R:
            this.rotateBrushEntity();
            break;
    }
};
UranusEditorEntitiesPaint.prototype.onMouseUp = function (e) {
    editor.emit("camera:toggle", true);
    if (e.button === pc.MOUSEBUTTON_LEFT) {
        this.parseMousePoint(e.x, e.y);
    }
    this.mouseDown = false;
};
UranusEditorEntitiesPaint.prototype.parseMousePoint = function (screenPosX, screenPosY) {
    var camera = editor.call("camera:current").camera;
    var start = camera.screenToWorld(screenPosX, screenPosY, camera.nearClip);
    var end = camera.screenToWorld(screenPosX, screenPosY, camera.farClip);
    var result = this.app.systems.rigidbody.raycastFirst(start, end);
    if (result) {
        // --- update the gizmo position
        if (this.gizmo) {
            this.gizmo.setPosition(result.point);
        }
        // --- check if we are painting or erasing
        if (this.buildButtonState) {
            this.spawnEntityInPoint(result.point, result.normal);
        }
        else if (this.eraseButtonState) {
            this.clearEntitiesInPoint(result.point);
        }
    }
};
UranusEditorEntitiesPaint.prototype.clearEntitiesInPoint = function (point) {
    var center = this.vec.copy(point);
    if (this.streamingData.length === 0) {
        if (!this.parentItem) {
            return false;
        }
        // --- iterate the instances and remove ones in the bounding area
        this.parentItem.get("children").forEach(function (guid) {
            var item = editor.call("entities:get", guid);
            if (item &&
                center.distance(item.entity.getPosition()) <= this.brushDistance) {
                editor.call("entities:removeEntity", item);
            }
        }.bind(this));
    }
    else {
        // --- get a list of all instances
        var instances = this.filterInstances(null, null);
        instances.forEach(function (instanceIndex) {
            var instance = this.getInstanceData(instanceIndex);
            if (center.distance(instance.position) <= this.brushDistance) {
                this.streamingData.splice(instanceIndex, 10);
            }
        }.bind(this));
    }
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.prepareHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.spawnEntityInPoint = function (point, normal) {
    this.currentPosition.set(point.x, point.y, point.z);
    // check if we are away of the config radius
    if (this.currentPosition.distance(this.lastPosition) < this.brushDistance) {
        return false;
    }
    var count = 0;
    // check how many items we will be creating
    if (this.itemsPerStroke > 1) {
        for (var i = 1; i <= this.itemsPerStroke; i++) {
            this.getRandomPositionInRadius(this.currentPosition, this.brushRadius);
            // --- get elevation under the point
            this.vec.set(this.randomPosition.x, this.randomPosition.y + 10000, this.randomPosition.z);
            this.vec1.set(this.randomPosition.x, this.randomPosition.y - 10000, this.randomPosition.z);
            var result = this.app.systems.rigidbody.raycastFirst(this.vec, this.vec1);
            if (result) {
                this.randomPosition.y = result.point.y;
            }
            else {
                this.randomPosition.y = this.currentPosition.y;
            }
            count++;
            this.createItem(this.randomPosition, normal);
        }
    }
    else {
        count++;
        this.createItem(this.currentPosition, normal);
    }
    this.lastPosition.set(point.x, point.y, point.z);
    Uranus.Editor.interface.logMessage('Entities Painter spawned <strong style="color: lightred;">' +
        count +
        '</strong> instances for <strong style="color: cyan;">' +
        this.entity.name +
        "</strong>");
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.prepareHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.getRandomPositionInRadius = function (center, radius) {
    var a = Math.random();
    var b = Math.random();
    this.randomPosition.x =
        center.x + b * radius * Math.cos((2 * Math.PI * a) / b);
    this.randomPosition.z =
        center.z + b * radius * Math.sin((2 * Math.PI * a) / b);
    return this.randomPosition;
};
UranusEditorEntitiesPaint.prototype.createItem = function (position, normal) {
    if (!this.parentItem) {
        return false;
    }
    // --- find bank item
    var bankItem = editor.call("entities:get", this.spawnEntity._guid);
    var bankChildren = bankItem.get("children");
    var bankIndex = 0;
    if (bankChildren && bankChildren.length > 0) {
        bankIndex = Math.floor(Math.random() * bankChildren.length);
        var randomGuid = bankChildren[bankIndex];
        bankItem = editor.call("entities:get", randomGuid);
    }
    if (!bankItem) {
        return false;
    }
    var item;
    var referenceEntity = bankItem.entity;
    // --- if we are using HW instancing, we spawn an empty entity (no model or other components)
    // if (this.hardwareInstancing) {
    //   item = editor.call("entities:new", {
    //     name: bankItem.entity.name,
    //     parent: this.parentItem,
    //     noHistory: false,
    //     noSelect: true,
    //   });
    //   item.set("enabled", false);
    //   referenceEntity = bankItem.entity;
    // } else {
    //   item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
    //   referenceEntity = item.entity;
    // }
    if (!this.streamingFile) {
        item = Uranus.Editor.duplicateEntities([bankItem], this.parentItem)[0];
        //referenceEntity = item.entity;
        // --- remove components
        this.componentsToClear.forEach(function (componentName) {
            item.unset("components." + componentName);
        });
        // --- clear LOD children if we use HW instancing and LOD is enabled
        if (this.hardwareInstancing === true && this.useLOD) {
            item.get("children").forEach(function (child) {
                var removeEntity = editor.call("entities:get", child);
                if (!removeEntity || removeEntity.get("name").indexOf("_LOD") === -1)
                    return;
                editor.call("entities:removeEntity", removeEntity);
            });
        }
    }
    // --- rotate or align them
    var angles = this.getBrushAngles(referenceEntity, normal);
    // --- scale them up
    var scale = this.getBrushScale(referenceEntity);
    // --- position + offset
    var finalPosition = this.getBrushPosition(position, scale);
    if (!this.streamingFile) {
        item.history.enabled = false;
        item.set("enabled", true);
        item.set("position", [finalPosition.x, finalPosition.y, finalPosition.z]);
        item.set("rotation", [angles.x, angles.y, angles.z]);
        item.set("scale", [scale.x, scale.y, scale.z]);
        item.history.enabled = true;
    }
    else {
        // --- save streaming info
        this.streamingData.push(bankIndex);
        this.streamingData.push(this.roundNumber(finalPosition.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(finalPosition.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(finalPosition.z, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.z, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.z, this.streamingPrecision));
    }
};
UranusEditorEntitiesPaint.prototype.getBrushPosition = function (position, scale) {
    var offset = this.vec4.copy(this.posOffset);
    // --- if required project offset to scale
    if (this.projectOffset) {
        offset.x *= scale.x;
        offset.y *= scale.y;
        offset.z *= scale.z;
    }
    return this.vec5.set(position.x + offset.x, position.y + offset.y, position.z + offset.z);
};
UranusEditorEntitiesPaint.prototype.getBrushScale = function (referenceEntity) {
    var scale = this.vec.copy(referenceEntity.getLocalScale());
    var newScaleFactor = pc.math.random(this.scaleMinMax.x, this.scaleMinMax.y);
    scale.scale(newScaleFactor);
    return scale;
};
UranusEditorEntitiesPaint.prototype.getBrushAngles = function (referenceEntity, normal) {
    var angles = this.vec1;
    if (this.alignThem) {
        // --- align in the direction of the hit normal
        this.setMat4Forward(this.matrix, normal, pc.Vec3.UP);
        this.quat.setFromMat4(this.matrix);
        angles
            .copy(this.quat.getEulerAngles())
            .sub(referenceEntity.getLocalEulerAngles());
    }
    else {
        angles.copy(referenceEntity.getLocalEulerAngles());
    }
    switch (this.rotateThem) {
        case "x":
            angles.x = pc.math.random(0, 360);
            break;
        case "y":
            angles.y = pc.math.random(0, 360);
            break;
        case "z":
            angles.z = pc.math.random(0, 360);
            break;
    }
    return angles;
};
UranusEditorEntitiesPaint.prototype.clearEditorInstances = function () {
    if (!this.streamingFile) {
        var items = editor.call("selector:items");
        if (!items || items.length === 0) {
            return false;
        }
        // --- parent item to add new items
        var parentItem = items[0];
        parentItem.get("children").forEach(function (guid) {
            var item = editor.call("entities:get", guid);
            if (item) {
                editor.call("entities:removeEntity", item);
            }
        });
    }
    else {
        this.streamingData = [];
        this.saveStreamingData();
    }
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.prepareHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.clearInstances = function () {
    var i, j;
    var payloads = this.payloads;
    if (payloads) {
        for (var lodIndex = 0; lodIndex < payloads.length; lodIndex++) {
            for (i = 0; i < payloads[lodIndex].length; i++) {
                var payload = payloads[lodIndex][i];
                var meshInstance = payload.meshInstance;
                // --- remove mesh instance to render lists
                var modelComponent = payload.baseEntity.model;
                for (j = 0; j < modelComponent.layers.length; j++) {
                    var layerID = modelComponent.layers[j];
                    var layer = this.app.scene.layers.getLayerById(layerID);
                    if (layer) {
                        layer.removeMeshInstances([meshInstance]);
                    }
                }
                meshInstance.setInstancing();
                if (payload.vertexBuffer) {
                    payload.vertexBuffer.destroy();
                }
            }
        }
    }
    this.payloads = undefined;
    this.cells = undefined;
};
UranusEditorEntitiesPaint.prototype.prepareHardwareInstancing = function () {
    return __awaiter(this, void 0, void 0, function () {
        var spawnNames, spawnEntities, vec, vec1, vec2, vec3, quat, matrix, i, j, spawnIndex, spawnEntity, instances, lodEntities, child, lodIndex, lodEntity, spawnScale, meshInstanceIndex, meshInstance, meshRotation, meshSphereRadius, payload, densityReduce, activeDensity, instancesData, instance, newPosition, height, normal, result, angles, scale, finalPosition, newInstance, instance, scale, matrix, cellPos, cell, lodIndex, lodPayloads, payload, totalMatrices, totalMatrixIndex, startCellIndex, endCellIndex, cellGuid, matricesPerCell, j, m, cellMatrices, bufferArray, meshInstance, modelComponent, layerID, layer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.clearInstances();
                    // --- get a list of the spawn entities to be instanced
                    if (this.spawnEntity) {
                        this.spawnEntities =
                            this.spawnEntity.children[0] instanceof pc.Entity
                                ? this.spawnEntity.children
                                : [this.spawnEntity];
                    }
                    else {
                        spawnNames = [];
                        this.spawnEntities = this.entity.find(function (entity) {
                            if (entity instanceof pc.Entity &&
                                spawnNames.indexOf(entity.name) === -1) {
                                spawnNames.push(entity.name);
                                return true;
                            }
                        }.bind(this));
                    }
                    return [4 /*yield*/, this.loadModelAssets(this.spawnEntities)];
                case 1:
                    _a.sent();
                    spawnEntities = this.spawnEntities;
                    vec = this.vec;
                    vec1 = this.vec1;
                    vec2 = this.vec2;
                    vec3 = this.vec3;
                    quat = this.quat;
                    matrix = this.matrix;
                    // --- prepare the instancing payloads/cells per LOD level
                    this.payloads = [[], [], [], []];
                    this.cells = {};
                    this.lodLevelsEnabled = [false, false, false, false];
                    for (spawnIndex = 0; spawnIndex < this.spawnEntities.length; spawnIndex++) {
                        spawnEntity = this.spawnEntities[spawnIndex];
                        instances = this.filterInstances(spawnEntity, spawnIndex);
                        lodEntities = [];
                        if (spawnEntity.model) {
                            lodEntities.push(spawnEntity);
                        }
                        else {
                            for (i = 0; i < spawnEntity.children.length; i++) {
                                child = spawnEntity.children[i];
                                if (!child.model)
                                    continue;
                                // --- search for a LOD entity
                                for (j = 0; j <= 3; j++) {
                                    if (child.name.indexOf("_LOD" + j) > -1) {
                                        lodEntities[j] = child;
                                        break;
                                    }
                                }
                            }
                        }
                        // --- main instancing prepare loop to find all the relevant mesh instances
                        for (lodIndex = 0; lodIndex < lodEntities.length; lodIndex++) {
                            lodEntity = lodEntities[lodIndex];
                            if (!lodEntity)
                                continue;
                            this.lodLevelsEnabled[lodIndex] = true;
                            spawnScale = this.spawnEntity
                                ? lodEntity.getLocalScale()
                                : this.vecOne;
                            for (meshInstanceIndex = 0; meshInstanceIndex < lodEntity.model.meshInstances.length; meshInstanceIndex++) {
                                meshInstance = lodEntity.model.meshInstances[meshInstanceIndex];
                                meshInstance.visible = false;
                                meshRotation = meshInstance.node.getLocalRotation().clone();
                                meshSphereRadius = meshInstance.aabb.halfExtents.length() * 2;
                                payload = {
                                    baseEntity: lodEntity,
                                    instances: instances,
                                    meshInstance: new pc.MeshInstance(meshInstance.node.clone(), meshInstance.mesh, meshInstance.material),
                                    meshRotation: meshRotation,
                                    matrices: [],
                                    matricesPerCell: {},
                                    totalBuffer: undefined,
                                    totalMatrices: undefined,
                                    vertexBuffer: undefined,
                                };
                                densityReduce = this.densityReduce;
                                activeDensity = densityReduce;
                                instancesData = [];
                                for (i = 0; i < instances.length; i++) {
                                    // --- check if we are reducing the density on build time
                                    if (densityReduce > 0) {
                                        activeDensity++;
                                        if (activeDensity <= densityReduce) {
                                            continue;
                                        }
                                        activeDensity = 0;
                                    }
                                    instance = this.getInstanceData(instances[i], spawnEntities, true);
                                    instancesData.push(instance);
                                    if (this.densityIncrease > 0 && this.streamingFile) {
                                        for (j = 0; j < Math.floor(this.densityIncrease); j++) {
                                            newPosition = this.getRandomPositionInRadius(instance.position, this.densityIncreaseRadius);
                                            height = instance.position.y;
                                            // --- get elevation under the point
                                            if (this.densityIncreaseRaycast) {
                                                this.vec.set(newPosition.x, newPosition.y + 10000, newPosition.z);
                                                this.vec1.set(newPosition.x, newPosition.y - 10000, newPosition.z);
                                                result = this.app.systems.rigidbody.raycastFirst(this.vec, this.vec1);
                                                if (result && result.entity.name.indexOf("Terrain") > -1) {
                                                    height = result.point.y;
                                                    normal = result.normal;
                                                }
                                                else {
                                                    continue;
                                                }
                                            }
                                            newPosition.y = height;
                                            angles = this.getBrushAngles(lodEntity, normal);
                                            scale = instance.scale;
                                            finalPosition = this.getBrushPosition(newPosition, scale);
                                            newInstance = {
                                                name: instance.name,
                                                position: new pc.Vec3().copy(finalPosition),
                                                rotation: new pc.Quat().setFromEulerAngles(angles.x, angles.y, angles.z),
                                                scale: new pc.Vec3().copy(scale),
                                            };
                                            instancesData.push(newInstance);
                                        }
                                    }
                                }
                                // --- main prepare loop
                                for (i = 0; i < instancesData.length; i++) {
                                    instance = instancesData[i];
                                    // --- disable model component if we have an entity and it exists
                                    if (instance.entity && instance.entity.model) {
                                        instance.entity.model.enabled = false;
                                    }
                                    // --- check if we are interested in this mesh instance
                                    if (instance.name !== spawnEntity.name)
                                        continue;
                                    scale = this.getInstanceScale(vec2, instance, spawnScale);
                                    matrix = this.getInstanceMatrix(new pc.Mat4(), quat, instance, instance.position, meshRotation, scale);
                                    payload.matrices.push(matrix);
                                    // --- create a bounding box for this instance
                                    matrix.sphere = new pc.BoundingSphere(instance.position.clone(), meshSphereRadius);
                                    cellPos = this.getCellPos(vec, instance.position);
                                    cell = this.getVisibilityCell(cellPos);
                                    matrix.cell = cell;
                                    matrix.instanceEntity = instance.entity;
                                    // --- add instance to per cell matrices list
                                    if (!payload.matricesPerCell[cell.guid]) {
                                        payload.matricesPerCell[cell.guid] = [];
                                    }
                                    payload.matricesPerCell[cell.guid].push(matrix);
                                }
                                // --- add payload to renderable list
                                if (payload.matrices.length > 0) {
                                    this.payloads[lodIndex].push(payload);
                                }
                            }
                        }
                    }
                    // --- fill up buffers
                    for (lodIndex = 0; lodIndex < this.payloads.length; lodIndex++) {
                        lodPayloads = this.payloads[lodIndex];
                        for (i = 0; i < lodPayloads.length; i++) {
                            payload = lodPayloads[i];
                            // --- prepare the instances buffers
                            payload.totalBuffer = new ArrayBuffer(payload.matrices.length * 16 * 4);
                            payload.culledMatrices = new Float32Array(payload.matrices.length * 16);
                            payload.totalMatrices = new Float32Array(payload.totalBuffer, 0, payload.matrices.length * 16);
                            totalMatrices = payload.totalMatrices;
                            totalMatrixIndex = 0;
                            startCellIndex = 0;
                            endCellIndex = 0;
                            // --- sort matrices per visibility cell
                            for (cellGuid in payload.matricesPerCell) {
                                matricesPerCell = payload.matricesPerCell[cellGuid];
                                // --- populate matrices buffers
                                for (j = 0; j < matricesPerCell.length; j++) {
                                    for (m = 0; m < 16; m++) {
                                        endCellIndex++;
                                        totalMatrices[totalMatrixIndex] = matricesPerCell[j].data[m];
                                        totalMatrixIndex++;
                                    }
                                }
                                cellMatrices = new Float32Array(payload.totalBuffer, startCellIndex * 4, endCellIndex - startCellIndex);
                                startCellIndex = endCellIndex;
                                // --- replaces matrices references with the single cell typed array
                                payload.matricesPerCell[cellGuid] = cellMatrices;
                            }
                            bufferArray = this.cullingCamera
                                ? UranusEditorEntitiesPaint.zeroBuffer
                                : payload.totalMatrices;
                            payload.vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, pc.VertexFormat.defaultInstancingFormat, this.cullingCamera ? 0 : bufferArray.length / 16, pc.BUFFER_STATIC, this.cullingCamera ? UranusEditorEntitiesPaint.zeroBuffer : bufferArray);
                            meshInstance = payload.meshInstance;
                            // --- enable instancing on the mesh instance
                            meshInstance.material.onUpdateShader = function (options) {
                                options.useInstancing = true;
                                return options;
                            };
                            meshInstance.material.update();
                            modelComponent = payload.baseEntity.model;
                            meshInstance.castShadow =
                                meshInstance.material.castShadows !== undefined
                                    ? meshInstance.material.castShadows
                                    : modelComponent.castShadows;
                            meshInstance.receiveShadow =
                                meshInstance.material.receiveShadows !== undefined
                                    ? meshInstance.material.receiveShadows
                                    : modelComponent.receiveShadows;
                            meshInstance.cull = false;
                            for (j = 0; j < modelComponent.layers.length; j++) {
                                layerID = modelComponent.layers[j];
                                layer = this.app.scene.layers.getLayerById(layerID);
                                if (layer) {
                                    layer.addMeshInstances([meshInstance]);
                                }
                            }
                            meshInstance.setInstancing(payload.vertexBuffer);
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
};
UranusEditorEntitiesPaint.prototype.getMeshInstancePosOffset = function (offset, center, spawnPos, spawnScale) {
    offset.copy(center).sub(spawnPos);
    offset.x /= spawnScale.x;
    offset.y /= spawnScale.y;
    offset.z /= spawnScale.z;
    return offset;
};
UranusEditorEntitiesPaint.prototype.getInstancePosition = function (position, instance, offset, scale) {
    // --- calculate pivot point position
    position.copy(instance.position);
    position.x += offset.x * scale.x;
    position.y += offset.y * scale.y;
    position.z += offset.z * scale.z;
    return position;
};
UranusEditorEntitiesPaint.prototype.getInstanceScale = function (scale, instance, spawnScale) {
    scale.copy(instance.scale).mul(spawnScale).scale(0.01);
    return scale.set(scale.x, scale.z, scale.y);
};
UranusEditorEntitiesPaint.prototype.getInstanceMatrix = function (matrix, quat, instance, position, rotation, scale) {
    // --- calculate angles
    quat.copy(instance.rotation).mul(rotation);
    // --- calculate instance matrix
    return matrix.setTRS(position, quat, scale);
};
UranusEditorEntitiesPaint.prototype.getVisibilityCell = function (cellPos) {
    var cellGuid = this.getCellGuid(cellPos);
    var cell = this.cells[cellGuid];
    // --- if cell doesn't exist, create it once
    if (!cell) {
        var halfExtents = new pc.Vec3().copy(this.cellSize).scale(2);
        this.cells[cellGuid] = new pc.BoundingBox(cellPos.clone(), halfExtents.clone());
        cell = this.cells[cellGuid];
        cell.guid = cellGuid;
        cell.sphere = new pc.BoundingSphere(cellPos.clone(), this.cellSize.x * 1.5);
        cell.isVisible = 0;
        cell.distanceFromCamera = 0;
        cell.activeLOD = 0;
    }
    return cell;
};
UranusEditorEntitiesPaint.prototype.cullHardwareInstancing = function () {
    var cullingCamera = this.cullingCamera;
    var payloads = this.payloads;
    if (!cullingCamera || !payloads || payloads.length === 0) {
        return;
    }
    // --- grab references for faster access
    var app = this.app;
    var spawnEntity = this.spawnEntity;
    var cells = this.cells;
    var useLOD = this.useLOD;
    var hideAfter = this.hideAfter;
    var frustum;
    var cameraPos = cullingCamera.getPosition();
    var hiddenCamera = this.hiddenCamera;
    var perInstanceCull = this.perInstanceCull;
    var lodDistance = this.lodDistance;
    var isStatic = this.isStatic;
    var lodLevels = this.lodLevels;
    var lodLevelsEnabled = this.lodLevelsEnabled;
    var lodThreshold = this.lodThreshold;
    var lodDistanceRaw = this.lodDistanceRaw;
    var vecOne = this.vecOne;
    var i, j, lodIndex;
    var instanceData = this.instanceData;
    var vec1 = this.vec1;
    var vec2 = this.vec2;
    var vec3 = this.vec3;
    var quat = this.quat;
    // --- use custom culling, if required
    if (hiddenCamera && hideAfter > 0) {
        hiddenCamera.setPosition(cameraPos);
        hiddenCamera.setRotation(cullingCamera.getRotation());
        hiddenCamera.camera.aspectRatio = cullingCamera.camera.aspectRatio;
        app.renderer.updateCameraFrustum(hiddenCamera.camera.camera);
        frustum = hiddenCamera.camera.frustum;
    }
    else {
        frustum = cullingCamera.camera.frustum;
    }
    // --- update visibility cells
    if (isStatic === true) {
        for (var cellGuid in cells) {
            var cell = cells[cellGuid];
            cell.isVisible = frustum.containsSphere(cell.sphere);
            cell.distanceFromCamera = this.distanceSq(cameraPos, cell.center);
            cell.activeLOD = useLOD
                ? this.getActiveLOD(cell.distanceFromCamera, lodDistance, this.lodLevelsEnabled)
                : 0;
        }
    }
    for (lodIndex = 0; lodIndex < payloads.length; lodIndex++) {
        // --- prepare lod levels
        lodDistanceRaw[2] = lodLevelsEnabled[3]
            ? lodLevels.z
            : hideAfter > 0
                ? hideAfter
                : 100000;
        lodDistanceRaw[1] = lodLevelsEnabled[2]
            ? lodLevels.y
            : hideAfter > 0
                ? hideAfter
                : 100000;
        lodDistanceRaw[0] = lodLevelsEnabled[1]
            ? lodLevels.x
            : hideAfter > 0
                ? hideAfter
                : 100000;
        for (i = 0; i < payloads[lodIndex].length; i++) {
            var payload = payloads[lodIndex][i];
            var bufferArray = payload.culledMatrices;
            if (!bufferArray)
                continue;
            // --- update effects uniforms
            payload.meshInstance.setParameter("uranusFadeOutDistance", lodDistanceRaw[lodIndex]);
            payload.meshInstance.setParameter("uranusFadeInDistance", lodIndex > 0 ? lodDistanceRaw[lodIndex - 1] : 0);
            payload.meshInstance.setParameter("uranusViewPosition", [
                cameraPos.x,
                cameraPos.y,
                cameraPos.z,
            ]);
            var lodEntity = payload.baseEntity;
            var spawnScale, spawnPos, offset;
            if (isStatic === false) {
                // --- get per payload references
                // spawnPos = lodEntity.getPosition();
                spawnScale = spawnEntity ? lodEntity.getLocalScale() : vecOne;
                // --- calculate pivot offset
                // offset = this.getMeshInstancePosOffset(
                //   vec3,
                //   payload.meshInstance.aabb.center,
                //   spawnPos,
                //   spawnScale
                // );
            }
            // --- there two main culling strategies:
            if (perInstanceCull === false) {
                if (lodIndex === cell.activeLOD) {
                    // 1. Per cell visibility
                    var endCellIndex = 0;
                    for (var cellGuid in payload.matricesPerCell) {
                        // --- check if cell is visible
                        if (cells[cellGuid].isVisible === 0)
                            continue;
                        var matricesPerCell = payload.matricesPerCell[cellGuid];
                        bufferArray.set(matricesPerCell, endCellIndex);
                        endCellIndex += matricesPerCell.length;
                    }
                    bufferArray = bufferArray.subarray(0, endCellIndex);
                }
                else {
                    bufferArray = UranusEditorEntitiesPaint.zeroBuffer;
                }
            }
            else {
                // 2. Per instance visibility
                var matrixIndex = 0;
                var visible;
                var cell;
                var matrices = payload.matrices;
                for (var j = 0; j < matrices.length; j++) {
                    var matrixInstance = matrices[j];
                    // --- check first if the containing cell is visible
                    visible = isStatic === true ? matrixInstance.cell.isVisible : 1;
                    if (isStatic === false) {
                        var instanceEntity = matrixInstance.instanceEntity;
                        var instance = instanceData;
                        instance.position.copy(instanceEntity.getPosition());
                        instance.rotation.copy(instanceEntity.getRotation());
                        instance.scale.copy(instanceEntity.getLocalScale());
                        var scale = this.getInstanceScale(vec2, instance, spawnScale);
                        // var position = this.getInstancePosition(
                        //   vec1,
                        //   instance,
                        //   offset,
                        //   scale
                        // );
                        matrixInstance.sphere.center.copy(instance.position);
                        this.getInstanceMatrix(matrixInstance, quat, instance, instance.position, payload.meshRotation, scale);
                    }
                    // --- frustum culling
                    if (visible > 0) {
                        visible = frustum.containsSphere(matrixInstance.sphere);
                    }
                    // --- LOD culling
                    if (useLOD === true && visible > 0) {
                        var distanceFromCamera = this.distanceSq(cameraPos, matrixInstance.sphere.center);
                        visible = this.checkActiveLOD(distanceFromCamera, lodDistance, lodIndex, lodLevelsEnabled, lodThreshold);
                    }
                    if (visible > 0) {
                        for (var m = 0; m < 16; m++) {
                            bufferArray[matrixIndex] = matrixInstance.data[m];
                            matrixIndex++;
                        }
                    }
                }
                bufferArray = bufferArray.subarray(0, matrixIndex);
            }
            var instancesCount = bufferArray.length / 16;
            // --- render the culled final buffer array
            var vertexBuffer = payload.vertexBuffer;
            // stats update
            app.graphicsDevice._vram.vb -= vertexBuffer.numBytes;
            var format = vertexBuffer.format;
            vertexBuffer.numBytes = format.verticesByteSize
                ? format.verticesByteSize
                : format.size * instancesCount;
            // stats update
            app.graphicsDevice._vram.vb += vertexBuffer.numBytes;
            vertexBuffer.setData(bufferArray);
            payload.meshInstance.instancingData.count = instancesCount;
            vertexBuffer.numVertices = instancesCount;
        }
        if (useLOD === false)
            break;
    }
};
UranusEditorEntitiesPaint.prototype.getActiveLOD = function (distanceFromCamera, lodDistance, lodLevelsEnabled) {
    var activeLodIndex = 0;
    if (distanceFromCamera >= lodDistance[0] &&
        (distanceFromCamera < lodDistance[1] || lodLevelsEnabled[2] === false)) {
        activeLodIndex = 1;
    }
    else if (distanceFromCamera >= lodDistance[1] &&
        (distanceFromCamera < lodDistance[2] || lodLevelsEnabled[3] === false)) {
        activeLodIndex = 2;
    }
    else if (distanceFromCamera >= lodDistance[2]) {
        activeLodIndex = 3;
    }
    return activeLodIndex;
};
UranusEditorEntitiesPaint.prototype.checkActiveLOD = function (distanceFromCamera, lodDistance, lodIndexToCheck, lodLevelsEnabled, lodThreshold) {
    if (lodIndexToCheck === 0 &&
        (distanceFromCamera < lodDistance[0] || lodLevelsEnabled[1] === false)) {
        return 1;
    }
    else if (lodIndexToCheck === 1 &&
        distanceFromCamera >= lodDistance[0] * lodThreshold &&
        (distanceFromCamera < lodDistance[1] || lodLevelsEnabled[2] === false)) {
        return 1;
    }
    else if (lodIndexToCheck === 2 &&
        distanceFromCamera >= lodDistance[1] * lodThreshold &&
        (distanceFromCamera < lodDistance[2] || lodLevelsEnabled[3] === false)) {
        return 1;
    }
    else if (lodIndexToCheck === 3 &&
        distanceFromCamera >= lodDistance[2] * lodThreshold) {
        return 1;
    }
    return 0;
};
UranusEditorEntitiesPaint.prototype.setMat4Forward = function (mat4, forward, up) {
    var x = this.x;
    var y = this.y;
    var z = this.z;
    // Inverse the forward direction as +z is pointing backwards due to the coordinate system
    z.copy(forward).scale(-1);
    y.copy(up).normalize();
    x.cross(y, z).normalize();
    y.cross(z, x);
    var r = mat4.data;
    r[0] = x.x;
    r[1] = x.y;
    r[2] = x.z;
    r[3] = 0;
    r[4] = y.x;
    r[5] = y.y;
    r[6] = y.z;
    r[7] = 0;
    r[8] = z.x;
    r[9] = z.y;
    r[10] = z.z;
    r[11] = 0;
    r[15] = 1;
    return mat4;
};
UranusEditorEntitiesPaint.prototype.roundNumber = function (x, base) {
    // base can be 1e3, 1e3 etc
    return Math.round(x * base) / base;
};
UranusEditorEntitiesPaint.prototype.loadStreamingData = function (streamingFile) {
    return new Promise(function (resolve) {
        if (streamingFile) {
            var onLoad = function () {
                var data;
                switch (streamingFile.type) {
                    case "binary":
                        data = msgpack.decode(new Uint8Array(this.streamingFile.resource));
                        if (Array.isArray(data) === false) {
                            data = [];
                        }
                        break;
                    default:
                        data =
                            Array.isArray(streamingFile.resources) &&
                                streamingFile.resources.length >= 10
                                ? streamingFile.resources
                                : [];
                        break;
                }
                // --- unload source file to preserve memory
                streamingFile.unload();
                resolve(data);
            }.bind(this);
            if (streamingFile.loaded) {
                onLoad();
            }
            else {
                streamingFile.ready(onLoad);
                this.app.assets.load(streamingFile);
            }
        }
        else {
            resolve([]);
        }
    }.bind(this));
};
UranusEditorEntitiesPaint.prototype.saveStreamingData = function () {
    // --- check if binary compression is required
    var filename = this.streamingFile.name;
    var contents;
    switch (this.streamingFile.type) {
        case "binary":
            contents = msgpack.encode(this.streamingData);
            break;
        default:
            contents = JSON.stringify(this.streamingData);
            // --- check if .json extension is included
            if (filename.indexOf(".json") === -1) {
                filename += ".json";
            }
            break;
    }
    var url = "https://playcanvas.com/api/assets/" + this.streamingFile.id;
    var form = new FormData();
    form.append("name", this.streamingFile.name);
    form.append("file", new Blob([contents]), filename);
    fetch(url, {
        method: "PUT",
        headers: {
            Authorization: "Bearer " + this.playcanvasToken,
        },
        body: form,
    });
};
UranusEditorEntitiesPaint.prototype.filterInstances = function (spawnEntity, spawnEntityIndex) {
    if (!this.streamingFile) {
        if (spawnEntity) {
            return this.entity.find(function (child) {
                return child instanceof pc.Entity && child.name === spawnEntity.name;
            });
        }
        else {
            return this.entity.children;
        }
    }
    else {
        var instances = [];
        for (var i = 0; i < this.streamingData.length; i += 10) {
            var index = this.streamingData[i];
            if (spawnEntityIndex === null ||
                (spawnEntityIndex !== null && index === spawnEntityIndex)) {
                instances.push(i);
            }
        }
        return instances;
    }
};
UranusEditorEntitiesPaint.prototype.getInstanceData = function (pointer, spawnEntities, spawnData) {
    var instanceData = this.instanceData;
    if (spawnData) {
        instanceData = {
            name: undefined,
            position: new pc.Vec3(),
            rotation: new pc.Quat(),
            scale: new pc.Vec3(),
        };
    }
    if (!this.streamingFile) {
        var entity = pointer;
        instanceData.name = entity.name;
        instanceData.entity = entity;
        instanceData.position.copy(entity.getPosition());
        instanceData.rotation.copy(entity.getRotation());
        instanceData.scale.copy(entity.getLocalScale());
    }
    else {
        var data = this.streamingData;
        instanceData.name = spawnEntities
            ? spawnEntities[data[pointer]].name
            : undefined;
        instanceData.position.set(data[pointer + 1], data[pointer + 2], data[pointer + 3]);
        instanceData.rotation.setFromEulerAngles(data[pointer + 4], data[pointer + 5], data[pointer + 6]);
        instanceData.scale.set(data[pointer + 7], data[pointer + 8], data[pointer + 9]);
    }
    return instanceData;
};
UranusEditorEntitiesPaint.prototype.distanceSq = function (lhs, rhs) {
    var x = lhs.x - rhs.x;
    var y = lhs.y - rhs.y;
    var z = lhs.z - rhs.z;
    return x * x + y * y + z * z;
};
UranusEditorEntitiesPaint.prototype.getCellPos = function (cell, pos) {
    cell.x = Math.floor(pos.x / this.cellSize.x) * this.cellSize.x;
    cell.y = Math.floor(pos.y / this.cellSize.y) * this.cellSize.y;
    cell.z = Math.floor(pos.z / this.cellSize.z) * this.cellSize.z;
    return cell;
};
UranusEditorEntitiesPaint.prototype.getCellGuid = function (cell) {
    return cell.x.toFixed(3) + "_" + cell.y.toFixed(3) + "_" + cell.z.toFixed(3);
};
UranusEditorEntitiesPaint.prototype.loadModelAssets = function (spawnEntities) {
    return new Promise(function (resolve) {
        var modelComponents = [];
        spawnEntities.forEach(function (spawnEntity) {
            modelComponents = modelComponents.concat(spawnEntity.findComponents("model"));
        }.bind(this));
        // --- assemble a list of all assets
        var assets = [];
        var asset;
        modelComponents.forEach(function (modelComponent) {
            if (modelComponent.asset) {
                asset = this.app.assets.get(modelComponent.asset);
                if (asset) {
                    assets.push(asset);
                    // --- gather material assets
                    if (modelComponent._mapping) {
                        for (var key in modelComponent._mapping) {
                            var materialAssetID = modelComponent._mapping[key];
                            asset = this.app.assets.get(materialAssetID);
                            if (asset)
                                assets.push(asset);
                        }
                    }
                }
            }
            // --- gather material assets
            if (modelComponent.materialAsset) {
                asset = this.app.assets.get(modelComponent.materialAsset);
                if (asset)
                    assets.push(asset);
            }
        }.bind(this));
        // --- load the assets
        var count = 0;
        assets.forEach(function (assetToLoad) {
            assetToLoad.ready(function () {
                count++;
                if (count === assets.length) {
                    resolve();
                }
            });
            this.app.assets.load(assetToLoad);
        }.bind(this));
    }.bind(this));
};
var UranusEffectAnimateMaterial = pc.createScript("uranusEffectAnimateMaterial");
UranusEffectAnimateMaterial.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEffectAnimateMaterial.attributes.add("materialAsset", {
    type: "asset",
});
UranusEffectAnimateMaterial.attributes.add("materialChannel", {
    type: "string",
});
UranusEffectAnimateMaterial.attributes.add("speed", {
    type: "vec2",
});
// initialize code called once per entity
UranusEffectAnimateMaterial.prototype.initialize = function () {
    this.vec = new pc.Vec2();
    this.material = this.materialAsset.resource;
};
// update code called every frame
UranusEffectAnimateMaterial.prototype.update = function (dt) {
    if (!this.material)
        return;
    // Calculate how much to offset the texture
    // Speed * dt
    this.vec.set(this.speed.x, this.speed.y);
    this.vec.scale(dt);
    // Update the diffuse and normal map offset values
    this.material[this.materialChannel].add(this.vec);
    this.material.update();
};
var UranusEffectGrassWind = pc.createScript('UranusEffectGrassWind');
UranusEffectGrassWind.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEffectGrassWind.attributes.add('materialAsset', { type: 'asset', assetType: 'material' });
UranusEffectGrassWind.attributes.add('wavelength', { type: 'number', default: 1 });
UranusEffectGrassWind.attributes.add('amplitude', { type: 'number', default: 0.05 });
// initialize code called once per entity
UranusEffectGrassWind.prototype.initialize = function () {
    if (!this.materialAsset) {
        return false;
    }
    var self = this;
    this.timer = pc.math.random(0, 10);
    this.materialAsset.ready(function () {
        var m = self.materialAsset.resource;
        self.material = m;
        if (self.material.uranusEffectGrassWind === true) {
            return;
        }
        self.material.uranusEffectGrassWind = true;
        m.chunks.baseVS = '   attribute vec3 vertex_position;\n' +
            '   attribute vec3 vertex_normal;\n' +
            '   attribute vec4 vertex_tangent;\n' +
            '   attribute vec2 vertex_texCoord0;\n' +
            '   attribute vec2 vertex_texCoord1;\n' +
            '   attribute vec4 vertex_color;\n' +
            '   \n' +
            '   uniform mat4 matrix_viewProjection;\n' +
            '   uniform mat4 matrix_model;\n' +
            '   uniform mat3 matrix_normal;\n' +
            "   uniform float time;\n" +
            "   uniform float amplitude;\n" +
            "   uniform float wavelength;\n" +
            '   \n' +
            '   vec3 dPositionW;\n' +
            '   mat4 dModelMatrix;\n' +
            '   mat3 dNormalMatrix;\n' +
            '   vec3 dLightPosW;\n' +
            '   vec3 dLightDirNormW;\n' +
            '  vec3 dNormalW;\n';
        m.chunks.transformVS =
            '   mat4 getModelMatrix() {\n' +
                '       #ifdef DYNAMICBATCH\n' +
                '       return getBoneMatrix(vertex_boneIndices);\n' +
                '       #elif defined(SKIN)\n' +
                '       return matrix_model * getSkinMatrix(vertex_boneIndices, vertex_boneWeights);\n' +
                '       #elif defined(INSTANCING)\n' +
                '       return mat4(instance_line1, instance_line2, instance_line3, instance_line4);\n' +
                '       #else\n' +
                '       return matrix_model;\n' +
                '       #endif\n' +
                '   }\n' +
                '   vec4 getPosition() {\n' +
                '       dModelMatrix = getModelMatrix();\n' +
                '       vec3 localPos = vertex_position;\n' +
                "localPos.xyz += sin((vertex_texCoord0.x + time + localPos.x + localPos.z) / wavelength) * amplitude * vertex_texCoord0.y;\n" +
                '       vec4 posW = dModelMatrix * vec4(localPos, 1.0);\n' +
                '       dPositionW = posW.xyz;\n' +
                '   \n' +
                '       vec4 screenPos;\n' +
                '       screenPos = matrix_viewProjection * posW;\n' +
                '       return screenPos;\n' +
                '   }\n' +
                '   vec3 getWorldPosition() {\n' +
                '       return dPositionW;\n' +
                '  }\n';
        m.update();
        self.updateAttributes();
    });
    this.app.assets.load(this.materialAsset);
    this.on('attr', this.updateAttributes);
};
// update code called every frame
UranusEffectGrassWind.prototype.update = function (dt) {
    if (this.material) {
        this.timer += dt;
        this.material.setParameter('time', this.timer);
    }
};
UranusEffectGrassWind.prototype.updateAttributes = function () {
    this.material.setParameter('wavelength', this.wavelength);
    this.material.setParameter('amplitude', this.amplitude);
};
var UranusEffectLodSwitch = pc.createScript('UranusEffectLodSwitch');
UranusEffectLodSwitch.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEffectLodSwitch.attributes.add('materialAsset', { type: 'asset', assetType: 'material' });
UranusEffectLodSwitch.attributes.add('fadeThreshold', { type: 'number', default: 1.0, min: 0.0, title: 'Fade Threshold' });
// initialize code called once per entity
UranusEffectLodSwitch.prototype.initialize = function () {
    if (!this.materialAsset) {
        return false;
    }
    this.materialAsset.ready(this.onMaterialUpdate.bind(this));
    this.materialAsset.on('change', this.onMaterialUpdate.bind(this));
    this.app.assets.load(this.materialAsset);
    this.on('attr', this.updateAttributes);
};
UranusEffectLodSwitch.prototype.onMaterialUpdate = function () {
    var m = this.materialAsset.resource;
    this.material = m;
    m.chunks.alphaTestPS = "    uniform float alpha_ref;" +
        "    uniform vec3 uranusViewPosition;" +
        "    uniform float uranusFadeInDistance;" +
        "    uniform float uranusFadeOutDistance;" +
        "    uniform float fadeThreshold;" +
        "    void alphaTest(float a) {" +
        "        float distance = distance(uranusViewPosition, vPositionW);" +
        "        float fadeFactor = alpha_ref;" +
        "        if( distance > (uranusFadeOutDistance * (1.0 - fadeThreshold) ) ){" +
        "            fadeFactor = clamp(distance / uranusFadeOutDistance, alpha_ref, 1.0);" +
        "        }" +
        "        if( distance < (uranusFadeInDistance * (1.0 - fadeThreshold) ) ){" +
        "            fadeFactor = clamp(distance / uranusFadeInDistance, alpha_ref, 1.0);" +
        "        }" +
        "        if (a < fadeFactor) discard;" +
        "    }";
    m.update();
    this.updateAttributes();
};
UranusEffectLodSwitch.prototype.updateAttributes = function () {
    this.material.setParameter('fadeThreshold', this.fadeThreshold);
};
var UranusEffectMaterialOverrideShadows = pc.createScript('UranusEffectMaterialOverrideShadows');
UranusEffectMaterialOverrideShadows.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEffectMaterialOverrideShadows.attributes.add('materialAsset', { type: 'asset', assetType: 'material' });
UranusEffectMaterialOverrideShadows.attributes.add("castShadows", {
    type: "boolean",
    default: true,
    title: "Cast Shadows",
});
UranusEffectMaterialOverrideShadows.attributes.add("receiveShadows", {
    type: "boolean",
    default: true,
    title: "Receive Shadows",
});
// initialize code called once per entity
UranusEffectMaterialOverrideShadows.prototype.initialize = function () {
    if (!this.materialAsset) {
        return false;
    }
    this.materialAsset.ready(function () {
        var material = this.materialAsset.resource;
        material.castShadows = this.castShadows;
        material.receiveShadows = this.receiveShadows;
    }.bind(this));
};
var UranusEffectWater = pc.createScript("uranusEffectWater");
UranusEffectWater.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusEffectWater.attributes.add("materialAsset", {
    type: "asset",
});
UranusEffectWater.attributes.add("depthMap", {
    type: "asset",
    assetType: "texture",
});
UranusEffectWater.attributes.add("camera", {
    type: "entity",
});
UranusEffectWater.attributes.add("resolution", {
    type: "number",
    default: 512,
    enum: [
        { 128: 128 },
        { 256: 256 },
        { 512: 512 },
        { 1024: 1024 },
        { 2048: 2048 },
        { 4096: 4096 },
    ],
});
UranusEffectWater.attributes.add("colorWater", {
    type: "rgb",
    default: [0, 0, 1],
});
UranusEffectWater.attributes.add("colorWave", {
    type: "rgba",
    default: [1, 1, 1, 0.5],
});
UranusEffectWater.attributes.add("speed", {
    type: "number",
    default: 2000,
});
UranusEffectWater.attributes.add("landWidth", {
    type: "number",
    default: 0.1,
});
UranusEffectWater.attributes.add("waveWidth", {
    type: "number",
    default: 0.1,
});
UranusEffectWater.attributes.add("waveFrequency", {
    type: "number",
    default: 1.0,
    min: 0.0,
});
UranusEffectWater.attributes.add("waveFalloff", {
    type: "number",
    default: 2.0,
    min: 0.0,
});
UranusEffectWater.attributes.add("depthFactor", {
    type: "number",
    default: 2.0,
    min: 1.0,
});
UranusEffectWater.attributes.add("depthDiscard", {
    type: "number",
    default: 1.0,
    min: 0.0,
    max: 1.0,
});
UranusEffectWater.attributes.add("shoreOpacity", {
    type: "number",
    default: 2.0,
    min: 0.0,
});
UranusEffectWater.attributes.add("waveVertexLength", {
    type: "number",
    default: 1.0,
    min: 0.0,
});
UranusEffectWater.attributes.add("waveVertexAmplitude", {
    type: "number",
    default: 1.0,
    min: 0.0,
});
UranusEffectWater.attributes.add("autoUpdate", {
    type: "boolean",
    default: false,
});
UranusEffectWater.prototype.initialize = function () {
    // --- shader
    this.chunkSources = this.getChunkSourcesShader();
    this.shaderVert = this.getVertPassThroughShader();
    this.shaderBlur = this.getGaussianBlurShader();
    this.shaderWater = this.getWaterShader();
    this.shaderOpacity = this.getOpacityShader();
    this.shaderTransform = this.getTransformShader();
    this.timer = 0;
    this.blurSamples = 3;
    this.blurPasses = 3;
    this.dirty = true;
    this.rendering = false;
    this.color3 = new Float32Array(3);
    this.color = new Float32Array(4);
    this.prepare();
    this.app.on("water:render", function () {
        this.dirty = true;
    }, this);
    this.on("destroy", this.onDestroy, this);
};
UranusEffectWater.prototype.prepare = function () {
    this.material = this.materialAsset.resource;
    this.material.chunks.diffusePS = this.shaderWater;
    this.material.chunks.opacityPS = this.shaderOpacity;
    this.material.chunks.transformVS = this.shaderTransform;
    // --- we clear one of the default material maps, to use for our custom depth map later
    // --- the reason for not putting a custom uniform is to provide editor editing of the material without breaking the shader on recompilation
    this.material.chunks.normalDetailMapPS =
        "vec3 addNormalDetail(vec3 normalMap) {return normalMap;}";
    this.prepareShaders();
    this.prepareTextures();
    this.prepareLayers();
    this.on("attr", this.updateUniforms);
};
UranusEffectWater.prototype.onDestroy = function () {
    this.app.off("water:render", this.render, this);
};
UranusEffectWater.prototype.prepareShaders = function () {
    this.vertexBuffer = this.createFullscreenQuad(this.app.graphicsDevice);
    var shaderBlur = this.shaderBlur.replace("%PRECISSION%", this.app.graphicsDevice.precision);
    this.quadShaderBlurHorizontal = new pc.Shader(this.app.graphicsDevice, {
        attributes: { aPosition: pc.SEMANTIC_POSITION },
        vshader: this.shaderVert,
        fshader: shaderBlur,
    });
    this.quadShaderBlurVertical = new pc.Shader(this.app.graphicsDevice, {
        attributes: { aPosition: pc.SEMANTIC_POSITION },
        vshader: this.shaderVert,
        fshader: shaderBlur,
    });
    this.uBlurOffsetsHorizontal = new Float32Array(this.blurSamples * 2);
    this.uBlurOffsetsVertical = new Float32Array(this.blurSamples * 2);
    this.uBlurWeights = new Float32Array([
        0.4,
        0.6,
        0.8,
        0.0875,
        0.05,
        0.025,
        0.0875,
        0.05,
        0.025,
        0.0875,
        0.05,
        0.025,
        0.0875,
        0.05,
        0.025,
    ]);
    var texel = 1 / this.resolution;
    // var offset = (this.blurSamples / 2) * texel;
    for (var i = 0; i < this.blurSamples; i++) {
        this.uBlurOffsetsHorizontal[i * 2] = texel * i;
        this.uBlurOffsetsVertical[i * 2 + 1] = texel * i;
    }
};
UranusEffectWater.prototype.prepareTextures = function () {
    this.textureA = new pc.Texture(this.app.graphicsDevice, {
        width: this.resolution,
        height: this.resolution,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    this.textureB = new pc.Texture(this.app.graphicsDevice, {
        width: this.resolution / 2,
        height: this.resolution / 2,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });
    this.renderTargetA = new pc.RenderTarget({
        colorBuffer: this.textureA,
        samples: 8,
    });
    this.renderTargetB = new pc.RenderTarget({
        colorBuffer: this.textureB,
        samples: 8,
    });
};
UranusEffectWater.prototype.prepareLayers = function () {
    var self = this;
    this.layer = this.app.scene.layers.getLayerByName("WaveSources");
    this.layer.renderTarget = this.renderTargetA;
    this.layer.passThrough = true;
    this.layer.shaderPass = 19;
    this.layer.enabled = false;
    var onUpdateShader = function (options) {
        if (!self.rendering)
            return options;
        var result = {};
        for (var key in options) {
            result[key] = options[key];
        }
        result.chunks = {};
        result.chunks.endPS = self.chunkSources;
        result.useSpecular = false;
        result.useMatalness = false;
        return result;
    };
    for (var i = 0; i < this.layer.opaqueMeshInstances.length; i++) {
        var mesh = this.layer.opaqueMeshInstances[i];
        mesh.material.onUpdateShader = onUpdateShader;
    }
    this.layer.clearCameras();
    this.layer.addCamera(this.camera.camera);
    this.layerComposition = new pc.LayerComposition();
    this.layerComposition.push(this.layer);
};
UranusEffectWater.prototype.updateWater = function () {
    //     this.camera.camera.orthoHeight = this.entity.getLocalScale().x / 2;
    //     var pos = this.entity.getPosition();
    //     this.camera.setPosition(pos.x, 16, pos.z);
    //     var rot = this.entity.getEulerAngles();
    //     if (rot.x > 90 || rot.x < -90) {
    //         this.camera.setEulerAngles(-90, 180 - rot.y, 0);
    //     } else {
    //         this.camera.setEulerAngles(-90, rot.y, 0);
    //     }
    this.camera.enabled = true;
    this.layer.enabled = true;
    this.rendering = true;
    this.app.renderer.renderComposition(this.layerComposition);
    this.rendering = false;
    this.layer.enabled = false;
    var scope = this.app.graphicsDevice.scope;
    scope.resolve("uWeights[0]").setValue(this.uBlurWeights);
    for (var i = 0; i < this.blurPasses; i++) {
        scope.resolve("uBaseTexture").setValue(this.textureA);
        scope.resolve("uOffsets[0]").setValue(this.uBlurOffsetsHorizontal);
        pc.drawFullscreenQuad(this.app.graphicsDevice, this.renderTargetB, this.vertexBuffer, this.quadShaderBlurHorizontal);
        scope.resolve("uBaseTexture").setValue(this.textureB);
        scope.resolve("uOffsets[0]").setValue(this.uBlurOffsetsVertical);
        pc.drawFullscreenQuad(this.app.graphicsDevice, this.renderTargetA, this.vertexBuffer, this.quadShaderBlurVertical);
    }
    this.material.diffuseMap = this.textureA;
    this.material.diffuseMapTiling = new pc.Vec2(1, 1);
    this.material.normalDetailMap = this.depthMap.resource;
    this.material.update();
    this.updateUniforms();
    this.camera.enabled = false;
};
UranusEffectWater.prototype.updateUniforms = function () {
    this.material.setParameter("waveWidth", this.waveWidth);
    this.material.setParameter("waveFrequency", this.waveFrequency);
    this.material.setParameter("waveFalloff", this.waveFalloff);
    this.material.setParameter("landWidth", this.landWidth);
    this.material.setParameter("depthFactor", this.depthFactor);
    this.material.setParameter("depthDiscard", this.depthDiscard);
    this.material.setParameter("shoreOpacity", this.shoreOpacity);
    this.material.setParameter("waveVertexLength", this.waveVertexLength);
    this.material.setParameter("waveVertexAmplitude", this.waveVertexAmplitude);
    this.material.setParameter("colorWater", this.mapColorToArray(this.colorWater, this.color3));
    this.material.setParameter("colorWave", this.mapColorToArray(this.colorWave, this.color));
};
UranusEffectWater.prototype.mapColorToArray = function (color, arr) {
    arr[0] = color.r;
    arr[1] = color.g;
    arr[2] = color.b;
    if (arr.length === 4)
        arr[3] = color.a;
    return arr;
};
// update code called every frame
UranusEffectWater.prototype.update = function (dt) {
    if (!this.material)
        return;
    if (this.autoUpdate === true || this.dirty || this.material.dirty) {
        this.dirty = false;
        this.updateWater();
    }
    this.material.setParameter("time", 1 - ((Date.now() / this.speed) % 1));
    this.timer += dt;
    this.material.setParameter("timer", this.timer);
};
UranusEffectWater.prototype.createFullscreenQuad = function (device) {
    // Create the vertex format
    var vertexFormat = new pc.VertexFormat(device, [
        { semantic: pc.SEMANTIC_POSITION, components: 2, type: pc.TYPE_FLOAT32 },
    ]);
    // Create a vertex buffer
    var vertexBuffer = new pc.VertexBuffer(device, vertexFormat, 4);
    // Fill the vertex buffer
    var iterator = new pc.VertexIterator(vertexBuffer);
    iterator.element[pc.SEMANTIC_POSITION].set(-1.0, -1.0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(1.0, -1.0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(-1.0, 1.0);
    iterator.next();
    iterator.element[pc.SEMANTIC_POSITION].set(1.0, 1.0);
    iterator.end();
    return vertexBuffer;
};
UranusEffectWater.prototype.getChunkSourcesShader = function () {
    return "gl_FragColor.rgb = vec3(1.0, 1.0, 1.0);";
};
UranusEffectWater.prototype.getVertPassThroughShader = function () {
    return ("attribute vec2 aPosition;\n" +
        "varying vec2 vUv0;\n" +
        "void main(void) {\n" +
        "    gl_Position = vec4(aPosition, 0.0, 1.0);\n" +
        "    vUv0 = (aPosition + 1.0) * 0.5;\n" +
        "}");
};
UranusEffectWater.prototype.getGaussianBlurShader = function () {
    return ("precision %PRECISSION% float;\n" +
        "varying vec2 vUv0;\n" +
        "uniform sampler2D uBaseTexture;\n" +
        "uniform vec2 uOffsets[5];\n" +
        "uniform vec3 uWeights[5];\n" +
        "void main(void) {\n" +
        "    vec2 uvs = vUv0;// + (sin(vUv0 * 128.0) / 1024.0);\n" +
        "    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n" +
        "    gl_FragColor.rgb = texture2D(uBaseTexture, uvs).rgb * uWeights[0];\n" +
        "  \n" +
        "    for (int i = 1; i < 5; i++) {\n" +
        "        gl_FragColor.rgb += texture2D(uBaseTexture, uvs + uOffsets[i]).rgb * uWeights[i];\n" +
        "        gl_FragColor.rgb += texture2D(uBaseTexture, uvs - uOffsets[i]).rgb * uWeights[i];\n" +
        "    }\n" +
        "}");
};
UranusEffectWater.prototype.getWaterShader = function () {
    return ("uniform sampler2D texture_diffuseMap;\n" +
        "uniform sampler2D texture_normalDetailMap;\n" +
        "uniform float time;\n" +
        "uniform float waveWidth;\n" +
        "uniform float waveFrequency;\n" +
        "uniform float waveFalloff;\n" +
        "uniform float landWidth;\n" +
        "uniform float depthFactor;\n" +
        "uniform float depthDiscard;\n" +
        "uniform vec3 colorWater;\n" +
        "uniform vec4 colorWave;\n" +
        "void getAlbedo() {\n" +
        "    vec3 depth = clamp( texture2D(texture_normalDetailMap, vec2(vUv0.x, 1.0 - vUv0.y)).rgb, 0.0, depthDiscard);\n" +
        "    dDiffuseLight = vec3(1.0);\n" +
        "    dAlbedo = mix(colorWater / depthFactor, colorWater, depth);\n" +
        "    vec3 base = texture2DSRGB(texture_diffuseMap, $UV).rgb;\n" +
        "    float b = mod((base.x / 2.0 + base.y / 2.0 + base.z) * 2.0, 1.0);\n" +
        "    float off = ((sin(vPositionW.x * waveFrequency) + 1.0) + (cos(vPositionW.z * waveFrequency) + 1.0)) / 4.0;// + time;\n" +
        "    float t = 1.0 - pow(1.0 - mod(time + off, 1.0), 0.3);\n" +
        "    float thickness = max(0.0, pow(t * 2.0, 2.0));\n" +
        "    if (base.z > 0.3) {\n" +
        "        dAlbedo = mix(dAlbedo, colorWave.rgb, colorWave.a);\n" +
        "    } else if (t < b && t > (b - (waveWidth * thickness)) && b > 0.01) {\n" +
        "        float o = 1.0 - pow(1.0 - t, waveFalloff);\n" +
        "        dAlbedo = mix(dAlbedo, colorWave.rgb, colorWave.a * o);\n" +
        "    }\n" +
        "    dAlbedo.rgb += base * landWidth;\n" +
        // "vec3 shoreMask = base;" +
        // "float maxAlpha = max(shoreMask.r, max(shoreMask.g, shoreMask.b) );" +
        // "    dAlbedo.rgb = vec3(maxAlpha);\n" +
        "}");
};
UranusEffectWater.prototype.getOpacityShader = function () {
    return "\n  #ifdef MAPFLOAT\n  uniform float material_opacity;\n  #endif\n  \n  uniform float shoreOpacity;\n\n  #ifdef MAPTEXTURE\n  uniform sampler2D texture_opacityMap;\n  #endif\n  \n  void getOpacity() {\n      dAlpha = 1.0;\n  \n      #ifdef MAPFLOAT\n      dAlpha *= material_opacity;\n      #endif\n  \n      #ifdef MAPTEXTURE\n\n      vec3 base = texture2DSRGB(texture_diffuseMap, $UV).rgb;\n      float shoreBase = max(base.r, max(base.g, base.b) );\n\n      float shoreAlpha = (1.0 - shoreBase * shoreOpacity);\n      float borderAlpha = texture2D(texture_opacityMap, $UV).$CH;\n\n      dAlpha *= min(shoreAlpha, borderAlpha);\n      #endif\n  \n      #ifdef MAPVERTEX\n      dAlpha *= clamp(vVertexColor.$VC, 0.0, 1.0);\n      #endif\n  }\n";
};
UranusEffectWater.prototype.getTransformShader = function () {
    return "\n\n  uniform float timer;\n  uniform float waveVertexLength;\n  uniform float waveVertexAmplitude;\n\n  mat4 getModelMatrix() {\n      return matrix_model;\n  }\n  \n  vec4 getPosition() {\n      dModelMatrix = getModelMatrix();\n      vec3 localPos = vertex_position; \n  \n      vec4 posW = dModelMatrix * vec4(localPos, 1.0);\n      posW.y += cos( (posW.x + timer) /waveVertexLength ) * sin( (posW.z + timer) /waveVertexLength ) * waveVertexAmplitude;\n\n      dPositionW = posW.xyz;\n  \n      vec4 screenPos = matrix_viewProjection * posW;\n\n      return screenPos;\n  }\n  \n  vec3 getWorldPosition() {\n      return dPositionW;\n  }\n";
};
var UranusBillboardRenderer = pc.createScript('UranusBillboardRenderer');
UranusBillboardRenderer.attributes.add('cameraEntity', { type: 'entity', title: 'Camera' });
UranusBillboardRenderer.attributes.add('billboard', { type: 'entity', title: 'Billboard' });
UranusBillboardRenderer.attributes.add('resolution', { type: 'vec2', default: [1024, 1024], placeholder: ['width', 'height'], title: 'Resolution' });
UranusBillboardRenderer.attributes.add('crop', { type: 'boolean', default: true, title: 'Crop' });
UranusBillboardRenderer.attributes.add('baseHeight', { type: 'boolean', default: true, title: 'Base Height' });
// initialize code called once per entity
UranusBillboardRenderer.prototype.initialize = function () {
    // --- variables
    this.vec = new pc.Vec3();
    this.count = 0;
    this.cameraEntity = this.cameraEntity ? this.cameraEntity : this.app.root.findByName('Camera');
    this.billboard = this.billboard ? this.billboard : this.entity;
    // --- prepare
    this.canvas = document.getElementById('application-canvas');
    this.trimCanvas = document.createElement('canvas');
    this.resizeCanvas = document.createElement('canvas');
    var linkElement = document.createElement('a');
    linkElement.id = 'link';
    window.document.body.appendChild(linkElement);
    // --- events
    this.app.keyboard.on(pc.EVENT_KEYUP, this.onKeyUp, this);
};
UranusBillboardRenderer.prototype.render = function () {
    // --- find the aabb and try to center/fit the object in the camera view
    this.aabb = new pc.BoundingBox();
    this.buildAabb(this.aabb, this.billboard);
    this.cameraEntity.camera.orthoHeight = this.aabb.halfExtents.y * 1.2;
    var cameraPos = this.cameraEntity.getPosition();
    this.cameraEntity.setPosition(cameraPos.x, this.aabb.center.y, cameraPos.z);
    // --- save and download a screen grab
    this.count++;
    var filename;
    if (this.billboard.model && this.billboard.model.asset) {
        var asset = this.app.assets.get(this.billboard.model.asset);
        filename = asset.name.split('.')[0] + '_billboard';
    }
    else {
        filename = this.billboard.name + '_billboard';
    }
    window.setTimeout(function () {
        this.takeScreenshot(filename);
    }.bind(this), 100);
};
UranusBillboardRenderer.prototype.onKeyUp = function (event) {
    if (event.key === pc.KEY_SPACE) {
        this.render();
    }
};
UranusBillboardRenderer.prototype.buildAabb = function (aabb, entity, modelsAdded) {
    var i = 0;
    if (entity.model) {
        var mi = entity.model.meshInstances;
        for (i = 0; i < mi.length; i++) {
            if (modelsAdded === 0) {
                aabb.copy(mi[i].aabb);
            }
            else {
                aabb.add(mi[i].aabb);
            }
            modelsAdded += 1;
        }
    }
    for (i = 0; i < entity.children.length; ++i) {
        modelsAdded += this.buildAabb(aabb, entity.children[i], modelsAdded);
    }
    return modelsAdded;
};
UranusBillboardRenderer.prototype.takeScreenshot = function (filename) {
    var image = this.canvas.toDataURL('image/png');
    if (this.crop) {
        this.trimImage(image).then(function (base64) {
            this.downloadImage(filename, base64);
        }.bind(this));
    }
    else {
        this.downloadImage(filename, image);
    }
};
UranusBillboardRenderer.prototype.downloadImage = function (filename, image) {
    var link = document.getElementById('link');
    link.setAttribute('download', filename + '.png');
    link.setAttribute('href', image.replace("image/png", "image/octet-stream"));
    link.click();
};
UranusBillboardRenderer.prototype.trimImage = function (base64) {
    return new Promise(function (resolve) {
        this.trimCanvas.width = this.canvas.width;
        this.trimCanvas.height = this.canvas.height;
        var ctx = this.trimCanvas.getContext('2d');
        var img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0, this.trimCanvas.width, this.trimCanvas.height);
            var pixels = ctx.getImageData(0, 0, this.trimCanvas.width, this.trimCanvas.height);
            var l = pixels.data.length, i, bound = {
                top: null,
                left: null,
                right: null,
                bottom: null
            }, x, y;
            // Iterate over every pixel to find the highest
            // and where it ends on every axis ()
            for (i = 0; i < l; i += 4) {
                if (pixels.data[i + 3] !== 0) {
                    x = (i / 4) % this.trimCanvas.width;
                    y = ~~((i / 4) / this.trimCanvas.width);
                    if (bound.top === null) {
                        bound.top = y;
                    }
                    if (bound.left === null) {
                        bound.left = x;
                    }
                    else if (x < bound.left) {
                        bound.left = x;
                    }
                    if (bound.right === null) {
                        bound.right = x;
                    }
                    else if (bound.right < x) {
                        bound.right = x;
                    }
                    if (bound.bottom === null) {
                        bound.bottom = y;
                    }
                    else if (bound.bottom < y) {
                        bound.bottom = y;
                    }
                }
            }
            var trimHeight = bound.bottom - bound.top, trimWidth = bound.right - bound.left, trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);
            if (this.resolution.x === 0 && this.resolution.y === 0) {
                this.trimCanvas.width = trimWidth;
                this.trimCanvas.height = trimHeight;
                ctx.putImageData(trimmed, 0, 0);
                resolve(this.trimCanvas.toDataURL('image/png'));
            }
            else {
                this.trimCanvas.width = this.baseHeight ? trimHeight : trimWidth;
                this.trimCanvas.height = this.baseHeight ? trimHeight : trimWidth;
                ctx.putImageData(trimmed, this.baseHeight ? (this.trimCanvas.width - trimWidth) / 2 : 0, this.baseHeight ? 0 : (this.trimCanvas.height - trimHeight) / 2);
                this.resizeCanvas.width = this.resolution.x;
                this.resizeCanvas.height = this.resolution.y;
                this.resizeCanvas.getContext('2d').drawImage(this.trimCanvas, 0, 0, this.trimCanvas.width, this.trimCanvas.height, 0, 0, this.resizeCanvas.width, this.resizeCanvas.height);
                resolve(this.resizeCanvas.toDataURL('image/png'));
            }
        }.bind(this);
        img.src = base64;
    }.bind(this));
};
var UranusHelperEntityPicker = pc.createScript("uranusHelperEntityPicker");
UranusHelperEntityPicker.attributes.add("camera", {
    type: "entity",
    title: "Camera",
});
UranusHelperEntityPicker.attributes.add("pickTags", {
    type: "string",
    default: "uranus-pickable",
    title: "Pick Tags",
    description: "If a tag is provided, only entities with that tag will be picked.",
});
UranusHelperEntityPicker.attributes.add("pickEvent", {
    type: "string",
    default: "uranusEntityPicker:picked",
    title: "Pick Event",
    description: "The app wide event fired when an entity is picked.",
});
// update code called every frame
UranusHelperEntityPicker.prototype.initialize = function () {
    this.picker = new pc.Picker(this.app.graphicsDevice, this.app.graphicsDevice.canvas.width, this.app.graphicsDevice.canvas.height);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
    }
    // --- events
    this.app.graphicsDevice.on("resizecanvas", this.onResize.bind(this));
};
UranusHelperEntityPicker.pickerCoords = new pc.Vec2();
UranusHelperEntityPicker.prototype.onMouseDown = function (e) {
    e.event.preventDefault();
    this.onSelect(e, "clickDown");
};
UranusHelperEntityPicker.prototype.onMouseMove = function (e) {
    e.event.preventDefault();
    UranusHelperEntityPicker.pickerCoords.set(e.x, e.y);
};
UranusHelperEntityPicker.prototype.onMouseUp = function (e) {
    e.event.preventDefault();
    this.onSelect(e, "click");
};
UranusHelperEntityPicker.prototype.onTouchStart = function (e) {
    this.onSelect(e.touches[0], "clickDown");
    e.event.preventDefault();
};
UranusHelperEntityPicker.prototype.onTouchMove = function (e) {
    UranusHelperEntityPicker.pickerCoords.set(e.touches[0].x, e.touches[0].y);
    e.event.preventDefault();
};
UranusHelperEntityPicker.prototype.onTouchEnd = function (e) {
    this.onSelect(e.changedTouches[0], "click");
    e.event.preventDefault();
};
UranusHelperEntityPicker.prototype.onResize = function (width, height) {
    this.picker.resize(width, height);
};
UranusHelperEntityPicker.prototype.onSelect = function (event, clickType) {
    var camera = this.camera.camera;
    var scene = this.app.scene;
    var picker = this.picker;
    picker.prepare(camera, scene);
    var selected = picker.getSelection(event.x * this.app.graphicsDevice.maxPixelRatio, event.y * this.app.graphicsDevice.maxPixelRatio);
    if (selected[0]) {
        // Get the graph node used by the selected mesh instance
        var entity = selected[0].node;
        // Bubble up the hierarchy until we find an actual Entity
        while (!(entity instanceof pc.Entity) && entity !== null) {
            entity = entity.getParent();
        }
        // --- has tag
        var hasTag = false;
        if (this.pickTags) {
            var pickTags = this.pickTags.split(",");
            var entityTags = entity.tags.list();
            for (var i = 0; i < entityTags.length; i++) {
                if (pickTags.indexOf(entityTags[i]) > -1) {
                    hasTag = true;
                    break;
                }
            }
        }
        if (entity && (!this.pickTags || hasTag === true)) {
            this.app.fire(this.pickEvent, entity, clickType, this.camera);
        }
        else {
            this.app.fire(this.pickEvent, null, clickType, this.camera);
        }
    }
};
// --- dependencies
// bezier.js
// ----------------
var UranusHelperLineRenderer = pc.createScript("uranusHelperLineRenderer");
UranusHelperLineRenderer.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusHelperLineRenderer.attributes.add("points", {
    type: "entity",
    array: true,
    title: "Points",
});
UranusHelperLineRenderer.attributes.add("color", {
    type: "rgb",
    title: "Color",
});
UranusHelperLineRenderer.attributes.add("isBezier", {
    type: "boolean",
    default: false,
    title: "Is Bezier?",
});
UranusHelperLineRenderer.attributes.add("bezierWeight", {
    type: "number",
    default: 0.5,
    title: "Bezier Weight",
});
UranusHelperLineRenderer.attributes.add("bezierAxis", {
    type: "string",
    default: "x",
    title: "Bezier Axis",
    enum: [{ X: "x" }, { Y: "y" }, { Z: "z" }],
});
UranusHelperLineRenderer.attributes.add("bezierDivisions", {
    type: "number",
    default: 25,
    title: "Bezier Divisions",
});
UranusHelperLineRenderer.attributes.add("renderOnInit", {
    type: "boolean",
    default: true,
    title: "Render On Init",
});
UranusHelperLineRenderer.attributes.add("updatePerFrame", {
    type: "boolean",
    default: false,
    title: "Update per Frame",
});
UranusHelperLineRenderer.attributes.add("fromSurface", {
    type: "boolean",
    default: false,
    title: "Points From Surface",
});
UranusHelperLineRenderer.prototype.initialize = function () {
    // --- variables
    this.lines = [];
    this.p1 = new pc.Vec3();
    this.p2 = new pc.Vec3();
    this.p3 = new pc.Vec3();
    this.p4 = new pc.Vec3();
    this.ready = false;
    // --- execute
    if (this.renderOnInit) {
        this.prepareLines();
    }
};
UranusHelperLineRenderer.prototype.editorAttrChange = function (property, value) {
    this.prepareLines();
};
// update code called every frame
UranusHelperLineRenderer.prototype.update = function () {
    if (this.updatePerFrame) {
        this.prepareLines();
    }
    if (this.ready) {
        this.renderLines();
    }
};
UranusHelperLineRenderer.prototype.prepareLines = function (points) {
    if (points) {
        this.points = points;
    }
    if (this.fromSurface && this.entity.script.uranusHelperResizableSurface) {
        this.points = this.entity.script.uranusHelperResizableSurface.children;
    }
    for (var index = 0; index < this.points.length - 1; index++) {
        var point = this.points[index];
        // --- create a line object or reuse on from the pool
        if (!this.lines[index]) {
            this.lines[index] = {
                startPoint: new pc.Vec3(),
                endPoint: new pc.Vec3(),
                bezier: undefined,
            };
        }
        var line = this.lines[index];
        // --- find start/end points
        line.startPoint = new pc.Vec3().copy(point.getPosition());
        line.endPoint = new pc.Vec3().copy(this.points[index + 1].getPosition());
        // --- prepare bezier line if required
        if (this.isBezier === true) {
            line.bezier = this.prepareBezierLine(line);
        }
        else {
            line.bezier = undefined;
        }
    }
    this.ready = true;
};
UranusHelperLineRenderer.prototype.prepareBezierLine = function (line) {
    // --- find start/end and middle points
    this.p1.copy(line.startPoint);
    this.p4.copy(line.endPoint);
    this.p2.lerp(this.p1, this.p4, this.bezierWeight);
    this.p2[this.bezierAxis] = this.p1[this.bezierAxis];
    this.p3.lerp(this.p4, this.p1, this.bezierWeight);
    this.p3[this.bezierAxis] = this.p3[this.bezierAxis];
    // --- spawn an instance
    return new Bezier(this.p1.x, this.p1.y, this.p1.z, this.p2.x, this.p2.y, this.p2.z, this.p3.x, this.p3.y, this.p3.z, this.p4.x, this.p4.y, this.p4.z);
};
UranusHelperLineRenderer.prototype.renderLines = function () {
    for (var index = 0; index < this.points.length - 1; index++) {
        var line = this.lines[index];
        if (this.isBezier === true) {
            this.renderBezierLine(line);
        }
        else {
            this.app.renderLine(line.startPoint, line.endPoint, this.color);
        }
    }
};
UranusHelperLineRenderer.prototype.renderBezierLine = function (line) {
    // Render the curve itself
    var lut = line.bezier.getLUT(this.bezierDivisions);
    for (var i = 0; i < lut.length - 1; i++) {
        this.p1.x = lut[i].x;
        this.p1.y = lut[i].y;
        this.p1.z = lut[i].z;
        this.p2.x = lut[i + 1].x;
        this.p2.y = lut[i + 1].y;
        this.p2.z = lut[i + 1].z;
        this.app.renderLine(this.p1, this.p2, this.color);
    }
};
var UranusHelperResizableSurface = pc.createScript("uranusHelperResizableSurface");
UranusHelperResizableSurface.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusHelperResizableSurface.attributes.add("target", {
    type: "entity",
    title: "Target",
});
UranusHelperResizableSurface.attributes.add("children", {
    type: "entity",
    array: true,
    title: "Children",
});
UranusHelperResizableSurface.attributes.add("alignPlane", {
    type: "string",
    default: "xz",
    title: "Align Plane",
    enum: [{ XZ: "xz" }, { XY: "xy" }, { YZ: "yz" }],
});
UranusHelperResizableSurface.attributes.add("padding", {
    type: "number",
    default: 0.1,
    title: "Padding",
});
UranusHelperResizableSurface.attributes.add("pivotPoint", {
    type: "string",
    default: "center",
    title: "Pivot Point",
    enum: [
        { Center: "center" },
        { "Top Left": "topLeft" },
        { "Top Right": "topRight" },
        { "Bottom Left": "bottomLeft" },
        { "Bottom Right": "bottomRight" },
    ],
});
UranusHelperResizableSurface.attributes.add("offset", {
    type: "vec3",
    default: [0, 0, 0],
    title: "Offset",
});
UranusHelperResizableSurface.attributes.add("minArea", {
    type: "vec3",
    default: [3, 3, 3],
    title: "Min Area",
});
UranusHelperResizableSurface.attributes.add("reorderChildren", {
    type: "string",
    default: "none",
    title: "Reorder Children",
    enum: [
        { "Don't reoder": "none" },
        { Ascending: "ascending" },
        { Descending: "descending" },
    ],
});
UranusHelperResizableSurface.attributes.add("renderOnInit", {
    type: "boolean",
    default: true,
    title: "Render On Init",
});
UranusHelperResizableSurface.attributes.add("updatePerFrame", {
    type: "boolean",
    default: false,
    title: "Update per Frame",
});
UranusHelperResizableSurface.prototype.initialize = function () {
    // --- variables
    this.vec = new pc.Vec3();
    this.vec2 = new pc.Vec3();
    this.aabb = new pc.BoundingBox();
    this.lockedAxis = undefined;
    // --- execute
    if (this.renderOnInit) {
        this.prepare();
        this.updateSurface();
    }
};
// update code called every frame
UranusHelperResizableSurface.prototype.update = function () {
    if (this.updatePerFrame) {
        this.prepare();
        this.updateSurface();
    }
};
UranusHelperResizableSurface.prototype.editorAttrChange = function (property, value) { };
UranusHelperResizableSurface.prototype.prepare = function (target, children) {
    if (children) {
        this.children = children;
    }
    if (target) {
        this.target;
    }
    else {
        this.target = this.target ? this.target : this.entity;
    }
    if (!this.target) {
        return false;
    }
};
UranusHelperResizableSurface.prototype.updateSurface = function () {
    if (!this.target || !this.children) {
        return false;
    }
    // --- calculate the total bounding box
    this.aabb.center.copy(this.entity.getPosition());
    this.aabb.halfExtents.set(0.001, 0.001, 0.001);
    for (var i = 0; i < this.children.length; ++i) {
        this.buildAabb(this.children[i], i + 1);
    }
    // --- scale the surface
    this.vec2.set(this.padding / 2, this.padding / 2, this.padding / 2);
    this.vec.copy(this.aabb.halfExtents).scale(2).add(this.vec2);
    var lockedAxis;
    switch (this.alignPlane) {
        case "xz":
            this.vec.y = this.minArea.y;
            this.aabb.halfExtents.y = 0.001;
            lockedAxis = "y";
            break;
        case "xy":
            this.vec.z = this.minArea.z;
            this.aabb.halfExtents.z = 0.001;
            lockedAxis = "z";
            break;
        case "yz":
            this.vec.x = this.minArea.x;
            this.aabb.halfExtents.x = 0.001;
            lockedAxis = "x";
            break;
    }
    this.lockedAxis = lockedAxis;
    if (this.vec.x < this.minArea.x && lockedAxis !== "x") {
        this.vec.x = this.minArea.x;
    }
    if (this.vec.y < this.minArea.y && lockedAxis !== "y") {
        this.vec.y = this.minArea.y;
    }
    if (this.vec.z < this.minArea.z && lockedAxis !== "z") {
        this.vec.z = this.minArea.z;
    }
    this.target.setLocalScale(this.vec);
    // --- position the surface
    this.vec2.copy(this.entity.getPosition()).add(this.offset);
    this.target.setPosition(this.vec2);
    // --- set pivot point
    if (this.alignPlane === "xz") {
        switch (this.pivotPoint) {
            case "topLeft":
                this.target.translate(-this.vec.x / 2, 0, this.vec.z / 2);
                break;
            case "topRight":
                this.target.translate(-this.vec.x / 2, 0, -this.vec.z / 2);
                break;
            case "bottomLeft":
                this.target.translate(this.vec.x / 2, 0, this.vec.z / 2);
                break;
            case "bottomRight":
                this.target.translate(this.vec.x / 2, 0, -this.vec.z / 2);
                break;
        }
    }
    if (this.alignPlane === "xy") {
        switch (this.pivotPoint) {
            case "topLeft":
                this.target.translate(this.vec.x / 2, -this.vec.y / 2, 0);
                break;
            case "topRight":
                this.target.translate(-this.vec.x / 2, -this.vec.y / 2, 0);
                break;
            case "bottomLeft":
                this.target.translate(this.vec.x / 2, this.vec.y / 2, 0);
                break;
            case "bottomRight":
                this.target.translate(-this.vec.x / 2, this.vec.y / 2, 0);
                break;
        }
    }
    if (this.alignPlane === "yz") {
        switch (this.pivotPoint) {
            case "topLeft":
                this.target.translate(0, -this.vec.y / 2, this.vec.z / 2);
                break;
            case "topRight":
                this.target.translate(0, -this.vec.y / 2, -this.vec.z / 2);
                break;
            case "bottomLeft":
                this.target.translate(0, this.vec.y / 2, this.vec.z / 2);
                break;
            case "bottomRight":
                this.target.translate(0, this.vec.y / 2, -this.vec.z / 2);
                break;
        }
    }
    // --- reorder children if required
    if (this.reorderChildren !== "none") {
        var primary = this.alignPlane[0];
        var secondary = this.alignPlane[1];
        this.children.sort(function (a, b) {
            var posA = a.getPosition();
            var posB = b.getPosition();
            var sameLine = Math.abs(posA[primary] - posB[primary]) <= 0.001;
            if (sameLine) {
                return this.reorderChildren === "ascending"
                    ? posA[secondary] < posB[secondary]
                        ? 1
                        : -1
                    : posA[secondary] > posB[secondary]
                        ? 1
                        : -1;
            }
            else {
                return this.reorderChildren === "ascending"
                    ? posA[primary] < posB[primary]
                        ? 1
                        : -1
                    : posA[primary] > posB[primary]
                        ? 1
                        : -1;
            }
        }.bind(this));
    }
    // --- add references to uranus node scripts
    this.children.forEach(function (child) {
        if (child && child.script && child.script.uranusNode) {
            child.script.uranusNode.uranusSurface = this;
        }
    }.bind(this));
};
UranusHelperResizableSurface.prototype.buildAabb = function (entity, modelsAdded) {
    var i = 0;
    if (entity.model && entity.model.meshInstances) {
        var mi = entity.model.meshInstances;
        for (i = 0; i < mi.length; i++) {
            if (modelsAdded === 0) {
                this.aabb.copy(mi[i].aabb);
            }
            else {
                this.aabb.add(mi[i].aabb);
            }
            modelsAdded += 1;
        }
    }
    for (i = 0; i < entity.children.length; ++i) {
        modelsAdded += this.buildAabb(entity.children[i], modelsAdded);
    }
    return modelsAdded;
};
UranusHelperResizableSurface.prototype.getSurfacePlane = function (plane) {
    if (!plane) {
        return;
    }
    plane.point.copy(this.entity.getPosition());
    switch (this.alignPlane) {
        case "xz":
            plane.normal.set(0, 1, 0);
            break;
        case "xy":
            plane.normal.set(0, 0, 1);
            break;
        case "yz":
            plane.normal.set(1, 0, 0);
            break;
    }
    return plane;
};
UranusHelperResizableSurface.prototype.isSurfacePointAllowed = function (point) {
    var surfacePos = this.entity.getPosition();
    switch (this.pivotPoint) {
        case "topLeft":
            if (point.x > surfacePos.x ||
                point.y > surfacePos.y ||
                point.z < surfacePos.z) {
                return false;
            }
            break;
        case "topRight":
            if (point.x > surfacePos.x ||
                point.y > surfacePos.y ||
                point.z > surfacePos.z) {
                return false;
            }
            break;
        case "bottomLeft":
            if (point.x < surfacePos.x ||
                point.y < surfacePos.y ||
                point.z < surfacePos.z) {
                return false;
            }
            break;
        case "bottomRight":
            if (point.x < surfacePos.x ||
                point.y < surfacePos.y ||
                point.z > surfacePos.z) {
                return false;
            }
            break;
    }
    return true;
    // switch (this.alignPlane) {
    //   case "xz":
    //     break;
    //   case "xy":
    //     break;
    //   case "yz":
    //     break;
    // }
};
var UranusNodeProperty = pc.createScript("uranusNodeProperty");
UranusNodeProperty.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusNodeProperty.attributes.add("side", {
    type: "string",
    default: "right",
    title: "Side",
    enum: [{ Right: "right" }, { Bottom: "bottom" }, { Left: "left" }],
});
UranusNodeProperty.attributes.add("type", {
    type: "string",
    title: "Type",
    description: "The type of node allowed to connect, if a category name is inserted multiple types of nodes can connect.",
});
UranusNodeProperty.attributes.add("array", {
    type: "boolean",
    default: false,
    title: "Array",
});
UranusNodeProperty.attributes.add("target", {
    type: "entity",
    title: "Target",
    description: "The entity that holds the node/nodes for this property. Leave blank to set this entity as target.",
});
var UranusNode = pc.createScript("uranusNode");
UranusNode.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusNode.attributes.add("category", {
    type: "string",
    title: "Category",
});
UranusNode.attributes.add("properties", {
    type: "entity",
    array: true,
    title: "Properties",
});
UranusNode.prototype.initialize = function () {
    // --- variables
    this.ray = new pc.Ray();
    this.vec = new pc.Vec3();
    this.hitPosition = new pc.Vec3();
    this.plane = new pc.Plane();
    this.pickerCamera = undefined;
    this.moving = false;
    this.selected = false;
    this.uranusSurface = undefined;
    this.initialPos = this.entity.getPosition().clone();
    // --- events
    this.app.on("uranusEntityPicker:picked", this.onNodePicked, this);
};
UranusNode.prototype.update = function () {
    if (this.moving) {
        this.nodeMove();
    }
};
UranusNode.prototype.onNodePicked = function (entity, pickType, pickerCamera) {
    // --- check if no entity has been selected
    if (!entity) {
        this.moving = false;
        return false;
    }
    // --- check if the selected entity is the script entity
    if (this.entity._guid !== entity._guid) {
        return false;
    }
    switch (pickType) {
        case "clickDown":
            this.moving = true;
            break;
        case "click":
            this.moving = false;
            break;
    }
    this.pickerCamera = pickerCamera;
};
UranusNode.prototype.nodeMove = function () {
    if (!this.pickerCamera) {
        return false;
    }
    this.pickerCamera.camera.screenToWorld(UranusHelperEntityPicker.pickerCoords.x, UranusHelperEntityPicker.pickerCoords.y, this.pickerCamera.camera.farClip, this.ray.direction);
    this.ray.origin.copy(this.pickerCamera.getPosition());
    this.ray.direction.sub(this.ray.origin).normalize();
    // Test the ray against the surface plane
    this.uranusSurface.getSurfacePlane(this.plane);
    var result = this.plane.intersectsRay(this.ray, this.hitPosition);
    if (result) {
        var currentPos = this.entity.getPosition();
        this.vec.copy(currentPos);
        this.vec[this.uranusSurface.lockedAxis] = this.initialPos[this.uranusSurface.lockedAxis];
        this.vec.x = this.hitPosition.x;
        if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
            this.vec.x = currentPos.x;
        }
        this.vec.y = this.hitPosition.y;
        if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
            this.vec.y = currentPos.y;
        }
        this.vec.z = this.hitPosition.z;
        if (this.uranusSurface.isSurfacePointAllowed(this.vec) === false) {
            this.vec.z = currentPos.z;
        }
        this.entity.setPosition(this.vec);
    }
};
var UranusTerrainGenerateHeightmap = pc.createScript("uranusTerrainGenerateHeightmap");
UranusTerrainGenerateHeightmap.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusTerrainGenerateHeightmap.attributes.add("heightMap", {
    type: "asset",
    assetType: "texture",
    array: true,
});
UranusTerrainGenerateHeightmap.attributes.add("subGridSize", {
    type: "number",
    default: 1,
    enum: [{ "1x1": 1 }, { "2x2": 2 }, { "3x3": 3 }, { "4x4": 4 }],
});
UranusTerrainGenerateHeightmap.attributes.add("minHeight", {
    type: "number",
    default: 0,
});
UranusTerrainGenerateHeightmap.attributes.add("maxHeight", {
    type: "number",
    default: 10,
});
UranusTerrainGenerateHeightmap.attributes.add("width", {
    type: "number",
    default: 100,
});
UranusTerrainGenerateHeightmap.attributes.add("depth", {
    type: "number",
    default: 100,
});
UranusTerrainGenerateHeightmap.attributes.add("subdivisions", {
    type: "number",
    default: 250,
});
UranusTerrainGenerateHeightmap.attributes.add("addCollision", {
    type: "boolean",
    default: false,
});
UranusTerrainGenerateHeightmap.attributes.add("material", {
    type: "asset",
    assetType: "material",
});
UranusTerrainGenerateHeightmap.attributes.add("modelLayers", {
    type: "string",
    description: "A comma separated list of layers to be added to the terrain model",
});
UranusTerrainGenerateHeightmap.attributes.add("eventInit", {
    type: "string",
});
UranusTerrainGenerateHeightmap.attributes.add("eventReady", {
    type: "string",
    default: "uranusTerrain:surface:ready",
});
//https://gamedev.stackexchange.com/questions/45938/apply-portion-of-texture-atlas
// initialize code called once per entity
UranusTerrainGenerateHeightmap.prototype.initialize = function () {
    // --- variables
    this.vec = new pc.Vec3();
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.gridSize = undefined;
    this.gridVertexData = undefined;
    // --- check when to execute, directly or after a custom event is fired
    if (this.eventInit) {
        this.app.on(this.eventInit, this.init, this);
    }
    else {
        this.init();
    }
};
UranusTerrainGenerateHeightmap.prototype.init = function () {
    // --- check if we've already initialized the terrain
    if (this.gridVertexData) {
        return false;
    }
    this.loadTerrainAssets([this.material].concat(this.heightMap)).then(this.createTerrain.bind(this));
};
UranusTerrainGenerateHeightmap.prototype.findGridHeightmaps = function () {
    var allHeightmaps = this.heightMap;
    var gridHeightmaps = [];
    this.gridSize = Math.floor(Math.sqrt(this.heightMap.length));
    var index = 0;
    for (var x = 0; x < this.gridSize; x++) {
        for (var y = 0; y < this.gridSize; y++) {
            var heightmap = allHeightmaps[index];
            if (!gridHeightmaps[x]) {
                gridHeightmaps[x] = [];
            }
            gridHeightmaps[x][y] = heightmap;
            index++;
        }
    }
    return gridHeightmaps;
};
UranusTerrainGenerateHeightmap.prototype.createTerrain = function () {
    // --- check if we've already initialized the terrain
    if (this.gridVertexData) {
        return false;
    }
    var x, y, xa, ya;
    // --- sort all heightmaps on a 2D grid
    var gridHeightmaps = this.findGridHeightmaps();
    // --- prepare the terrain vertex data
    this.gridVertexData = [];
    for (x = 0; x < this.gridSize; x++) {
        for (y = 0; y < this.gridSize; y++) {
            var heightmapAsset = gridHeightmaps[x][y];
            var heightmap = heightmapAsset.resource.getSource();
            var bufferWidth = heightmap.width;
            var bufferHeight = heightmap.height;
            this.canvas.width = bufferWidth;
            this.canvas.height = bufferHeight;
            this.context.drawImage(heightmap, 0, 0);
            var subGridVertexData = [];
            for (xa = 0; xa < this.subGridSize; xa++) {
                for (ya = 0; ya < this.subGridSize; ya++) {
                    var totalX = x + xa;
                    var totalY = y + ya;
                    if (!this.gridVertexData[totalX]) {
                        this.gridVertexData[totalX] = [];
                    }
                    if (!subGridVertexData[xa]) {
                        subGridVertexData[xa] = [];
                    }
                    var vertexData = this.prepareTerrainFromHeightMap(totalX, totalY, subGridVertexData);
                    this.gridVertexData[totalX][totalY] = vertexData;
                    subGridVertexData[xa][ya] = vertexData;
                }
            }
            heightmapAsset.unload();
        }
    }
    var totalGridSize = this.gridSize * this.subGridSize;
    // --- fix the border normals now that we have all neighbor data
    for (x = 0; x < totalGridSize; x++) {
        for (y = 0; y < totalGridSize; y++) {
            this.calculateNormalsBorders(x, y, this.subdivisions);
        }
    }
    // --- create the final tile model for each chunk
    for (x = 0; x < totalGridSize; x++) {
        for (y = 0; y < totalGridSize; y++) {
            var vertexData = this.gridVertexData[x][y];
            var model = this.createTerrainFromVertexData(vertexData);
            var chunkEntity = this.addModelToComponent(model, x, y);
            chunkEntity.setPosition(x * this.width, 0, (totalGridSize - y - 1) * this.depth);
        }
    }
    // --- to trick the physics engine to add the bodies in the sim
    this.entity.enabled = false;
    this.entity.enabled = true;
    // --- fire a custom app wide event that the terrain surface is ready
    this.app.fire(this.eventReady, this.entity);
};
UranusTerrainGenerateHeightmap.prototype.createTerrainVertexData = function (options) {
    var positions = [];
    var uvs = [];
    var indices = [];
    var row, col;
    var lastRow = [];
    var lastCol = [];
    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            var position = new pc.Vec3((col * options.width) / options.subdivisions - options.width / 2.0, 0, ((options.subdivisions - row) * options.height) / options.subdivisions - options.height / 2.0);
            var heightMapX = (((position.x + options.width / 2) / options.width) * (options.bufferWidth - 1)) | 0;
            var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) * (options.bufferHeight - 1)) | 0;
            var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
            var r = options.buffer[pos] / 255.0;
            var g = options.buffer[pos + 1] / 255.0;
            var b = options.buffer[pos + 2] / 255.0;
            var gradient = r * 0.3 + g * 0.59 + b * 0.11;
            position.y = options.minHeight + (options.maxHeight - options.minHeight) * gradient;
            positions.push(position.x, position.y, position.z);
            uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
        }
    }
    for (row = 0; row < options.subdivisions; row++) {
        for (col = 0; col < options.subdivisions; col++) {
            indices.push(col + row * (options.subdivisions + 1));
            indices.push(col + 1 + row * (options.subdivisions + 1));
            indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
            indices.push(col + row * (options.subdivisions + 1));
            indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
            indices.push(col + (row + 1) * (options.subdivisions + 1));
        }
    }
    var normals = pc.calculateNormals(positions, indices);
    return {
        indices: indices,
        positions: positions,
        normals: normals,
        uvs: uvs,
        lastCol: lastCol,
        lastRow: lastRow,
    };
};
UranusTerrainGenerateHeightmap.prototype.calculateNormalsBorders = function (x, y, subdivisions) {
    var i, b;
    var vec = this.vec;
    var normals = this.gridVertexData[x][y].normals;
    if (this.gridVertexData[x][y + 1] !== undefined) {
        for (i = 0; i <= subdivisions; i++) {
            b = i + subdivisions * (subdivisions + 1);
            vec.set(normals[b * 3], normals[b * 3 + 1], normals[b * 3 + 2]);
            vec.x += this.gridVertexData[x][y + 1].normals[i * 3];
            vec.y += this.gridVertexData[x][y + 1].normals[i * 3 + 1];
            vec.z += this.gridVertexData[x][y + 1].normals[i * 3 + 2];
            vec.normalize();
            normals[b * 3] = vec.x;
            normals[b * 3 + 1] = vec.y;
            normals[b * 3 + 2] = vec.z;
            this.gridVertexData[x][y + 1].normals[i * 3] = vec.x;
            this.gridVertexData[x][y + 1].normals[i * 3 + 1] = vec.y;
            this.gridVertexData[x][y + 1].normals[i * 3 + 2] = vec.z;
        }
    }
    if (this.gridVertexData[x + 1] !== undefined && this.gridVertexData[x + 1][y] !== undefined) {
        for (var index = 0; index <= subdivisions; index++) {
            i = index * (subdivisions + 1) + subdivisions;
            b = index * (subdivisions + 1);
            vec.set(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
            vec.x += this.gridVertexData[x + 1][y].normals[b * 3];
            vec.y += this.gridVertexData[x + 1][y].normals[b * 3 + 1];
            vec.z += this.gridVertexData[x + 1][y].normals[b * 3 + 2];
            vec.normalize();
            normals[i * 3] = vec.x;
            normals[i * 3 + 1] = vec.y;
            normals[i * 3 + 2] = vec.z;
            this.gridVertexData[x + 1][y].normals[b * 3] = vec.x;
            this.gridVertexData[x + 1][y].normals[b * 3 + 1] = vec.y;
            this.gridVertexData[x + 1][y].normals[b * 3 + 2] = vec.z;
        }
    }
};
UranusTerrainGenerateHeightmap.prototype.prepareTerrainFromHeightMap = function (cellX, cellY, subGridVertexData) {
    var totalWidth = this.canvas.width;
    var totalHeight = this.canvas.height;
    var cellWidth = totalWidth / this.subGridSize;
    var cellHeight = totalHeight / this.subGridSize;
    var startX = cellWidth * cellX;
    var startY = cellHeight * cellY;
    var buffer = this.context.getImageData(startX, startY, cellWidth, cellHeight).data;
    if (cellX > 0 || cellY > 0) {
        var prevCellX = subGridVertexData[cellX - 1] ? subGridVertexData[cellX - 1][cellY] : null;
        var lastRow = prevCellX ? prevCellX.bufferWidth * 4 - 4 : 0;
        var prevCellY = subGridVertexData[cellX][cellY - 1];
        var lastCol = prevCellY ? (prevCellY.bufferHeight - 1) * prevCellY.bufferWidth * 4 : 0;
        for (var p = 0; p <= buffer.length; p += 4) {
            var curX = (p / 4) % cellWidth, curY = (p / 4 - curX) / cellHeight;
            if (curX === 0 && prevCellX) {
                buffer[p] = prevCellX.buffer[p + lastRow];
                buffer[p + 1] = prevCellX.buffer[p + lastRow + 1];
                buffer[p + 2] = prevCellX.buffer[p + lastRow + 2];
                buffer[p + 3] = prevCellX.buffer[p + lastRow + 3];
            }
            if (curY === 0 && prevCellY) {
                buffer[p] = prevCellY.buffer[p + lastCol];
                buffer[p + 1] = prevCellY.buffer[p + lastCol + 1];
                buffer[p + 2] = prevCellY.buffer[p + lastCol + 2];
                buffer[p + 3] = prevCellY.buffer[p + lastCol + 3];
            }
        }
    }
    var vertexData = this.createTerrainVertexData({
        width: this.width,
        height: this.depth,
        subdivisions: this.subdivisions,
        minHeight: this.minHeight * this.subGridSize,
        maxHeight: this.maxHeight * this.subGridSize,
        buffer: buffer,
        bufferWidth: cellWidth,
        bufferHeight: cellHeight,
    });
    vertexData.buffer = buffer;
    vertexData.bufferWidth = cellWidth;
    vertexData.bufferHeight = cellHeight;
    return vertexData;
};
UranusTerrainGenerateHeightmap.prototype.createTerrainFromVertexData = function (vertexData) {
    var node = new pc.GraphNode();
    var material = this.material.resource;
    var mesh = pc.createMesh(this.app.graphicsDevice, vertexData.positions, {
        normals: vertexData.normals,
        uvs: vertexData.uvs,
        indices: vertexData.indices,
    });
    var meshInstance = new pc.MeshInstance(node, mesh, material);
    var model = new pc.Model();
    model.graph = node;
    model.meshInstances.push(meshInstance);
    return model;
};
UranusTerrainGenerateHeightmap.prototype.addModelToComponent = function (renderModel, coordX, coordY) {
    var chunkEntity = new pc.Entity();
    chunkEntity.name = "Tile_" + coordX + "_" + coordY;
    this.entity.addChild(chunkEntity);
    var layers = [this.app.scene.layers.getLayerByName("World").id];
    // --- check if we've been passed additional layers
    var customLayers = this.modelLayers.split(",");
    customLayers.forEach(function (customLayerName) {
        if (customLayerName) {
            // --- check if layer exists
            var layer = this.app.scene.layers.getLayerByName(customLayerName);
            if (layer) {
                layers.push(layer.id);
            }
        }
    }.bind(this));
    chunkEntity.addComponent("model", {
        layers: layers,
        castShadows: false,
        receiveShadows: true,
    });
    chunkEntity.model.model = renderModel;
    if (this.addCollision) {
        chunkEntity.addComponent("collision", {
            type: "mesh",
        });
        chunkEntity.collision.model = renderModel;
        chunkEntity.addComponent("rigidbody", {
            friction: this.entity.rigidbody ? this.entity.rigidbody.friction : 0.5,
            restitution: this.entity.rigidbody ? this.entity.rigidbody.restitution : 0.5,
            type: "static",
        });
    }
    return chunkEntity;
};
UranusTerrainGenerateHeightmap.prototype.loadTerrainAssets = function (assets) {
    return new Promise(function (resolve) {
        // --- load the assets
        var count = 0;
        assets.forEach(function (assetToLoad) {
            assetToLoad.ready(function () {
                count++;
                if (count === assets.length) {
                    resolve();
                }
            });
            this.app.assets.load(assetToLoad);
        }.bind(this));
    }.bind(this));
};
var UranusTerrainSplatmaps = pc.createScript("uranusTerrainSplatmaps");
UranusTerrainSplatmaps.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusTerrainSplatmaps.attributes.add("colorMaps", {
    type: "asset",
    array: true,
    assetType: "texture",
    title: "Color Maps",
});
UranusTerrainSplatmaps.attributes.add("occlusionMaps", {
    type: "asset",
    array: true,
    assetType: "texture",
    title: "Occlusion Maps",
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
    type: "asset",
    assetType: "material",
});
UranusTerrainSplatmaps.attributes.add("textureChannel0", {
    type: "asset",
    assetType: "material",
    title: "Textures Channel 1",
    description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel1", {
    type: "asset",
    assetType: "material",
    title: "Textures Channel 2",
    description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel2", {
    type: "asset",
    assetType: "material",
    title: "Textures Channel 3",
    description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("textureChannel3", {
    type: "asset",
    assetType: "material",
    title: "Textures Channel 4",
    description: "Reference a material containing diffuse and optionally a normal and/or heightmap for the given channel.",
});
UranusTerrainSplatmaps.attributes.add("tiling", {
    type: "number",
    default: 1,
});
UranusTerrainSplatmaps.attributes.add("eventInit", {
    type: "string",
});
UranusTerrainSplatmaps.attributes.add("eventReady", {
    type: "string",
    default: "uranusTerrain:splatmaps:ready",
});
// initialize code called once per entity
UranusTerrainSplatmaps.prototype.initialize = function () {
    // --- variables
    this.uranusTerrain = undefined;
    this.gridSize = undefined;
    // --- check when to execute, directly or after a custom event is fired
    if (this.eventInit) {
        this.app.on(this.eventInit, this.init, this);
    }
    this.on("attr", this.render, this);
};
UranusTerrainSplatmaps.prototype.init = function (terrainEntity) {
    this.uranusTerrain = terrainEntity && terrainEntity.script && terrainEntity.script.uranusTerrainGenerateHeightmap ? terrainEntity.script.uranusTerrainGenerateHeightmap : null;
    this.loadTerrainAssets([this.materialAsset].concat(this.colorMaps).concat(this.occlusionMaps)).then(function () {
        // --- check if we are using the
        this.useAlpha = this.textureChannel3 !== null;
        this.useNormalMap = false;
        this.useDiffuseMap = false;
        this.useParallaxMap = false;
        // --- prepare the material
        var material = this.materialAsset.resource;
        this.material = material;
        // --- add the shader overrides per material channel
        material.chunks.basePS = this.getBaseShader();
        var colormapReady = false;
        if (material.heightMap) {
            material.chunks.parallaxPS = this.getParallaxShader(colormapReady === false);
            colormapReady = true;
            this.useParallaxMap = true;
        }
        if (material.normalMap) {
            material.chunks.normalMapPS = this.getNormalShader(colormapReady === false);
            colormapReady = true;
            this.useNormalMap = true;
        }
        if (material.diffuseMap) {
            material.chunks.diffusePS = this.getDiffuseShader(colormapReady === false, this.occlusionMaps.length > 0);
            colormapReady = true;
            this.useDiffuseMap = true;
        }
        material.update();
        this.render();
        // --- fire a custom app wide event that the terrain surface is ready
        this.app.fire(this.eventReady, this.entity);
    }.bind(this));
};
UranusTerrainSplatmaps.prototype.render = function () {
    var allColormaps = this.colorMaps;
    var allOcclusionmaps = this.occlusionMaps;
    this.gridSize = this.uranusTerrain.gridSize;
    var index = 0;
    for (var x = 0; x < this.gridSize; x++) {
        for (var y = 0; y < this.gridSize; y++) {
            var colormap = allColormaps[index];
            var occlusionmap = allOcclusionmaps[index];
            var chunkEntity = this.entity.findByName("Tile_" + x + "_" + y);
            this.updateUniforms(chunkEntity.model.meshInstances[0], colormap.resource, occlusionmap ? occlusionmap.resource : null);
            index++;
        }
    }
};
UranusTerrainSplatmaps.prototype.updateUniforms = function (meshInstance, colormap, occlusionmap) {
    meshInstance.setParameter("texture_colorMap", colormap);
    if (this.useParallaxMap) {
        meshInstance.setParameter("heightMap_channel0", this.textureChannel0.resource.heightMap);
        meshInstance.setParameter("heightMap_channel1", this.textureChannel1.resource.heightMap);
        meshInstance.setParameter("heightMap_channel2", this.textureChannel2.resource.heightMap);
        if (this.useAlpha) {
            meshInstance.setParameter("heightMap_channel3", this.textureChannel3.resource.heightMap);
        }
    }
    if (this.useNormalMap) {
        meshInstance.setParameter("normalMap_channel0", this.textureChannel0.resource.normalMap);
        meshInstance.setParameter("normalMap_channel1", this.textureChannel1.resource.normalMap);
        meshInstance.setParameter("normalMap_channel2", this.textureChannel2.resource.normalMap);
        if (this.useAlpha) {
            meshInstance.setParameter("normalMap_channel3", this.textureChannel3.resource.normalMap);
        }
    }
    if (this.useDiffuseMap) {
        meshInstance.setParameter("texture_channel0", this.textureChannel0.resource.diffuseMap);
        meshInstance.setParameter("texture_channel1", this.textureChannel1.resource.diffuseMap);
        meshInstance.setParameter("texture_channel2", this.textureChannel2.resource.diffuseMap);
        if (this.useAlpha) {
            meshInstance.setParameter("texture_channel3", this.textureChannel3.resource.diffuseMap);
        }
        if (occlusionmap) {
            meshInstance.setParameter("texture_occlusion", occlusionmap);
        }
    }
    meshInstance.setParameter("terrain_tile", this.tiling);
};
UranusTerrainSplatmaps.prototype.getBaseShader = function () {
    return "uniform sampler2D texture_colorMap;\n" + "vec4 colormap;\n" + "uniform float terrain_tile;\n" + "uniform vec3 view_position;\n" + "uniform vec3 light_globalAmbient;\n" + "float square(float x) {\n" + "   return x*x;\n" + "}\n" + "float saturate(float x) {\n" + "   return clamp(x, 0.0, 1.0);\n" + "}\n" + "vec3 saturate(vec3 x) {\n" + "   return clamp(x, vec3(0.0), vec3(1.0));\n" + "}\n";
};
UranusTerrainSplatmaps.prototype.getDiffuseShader = function (calcColormap, useOcclusion) {
    return ("   uniform sampler2D texture_channel0;\n" +
        "   uniform sampler2D texture_channel1;\n" +
        "   uniform sampler2D texture_channel2;\n" +
        "   uniform sampler2D texture_channel3;\n" +
        (useOcclusion ? "   uniform sampler2D texture_occlusion;\n" : "") +
        "   void getAlbedo() {\n" +
        (calcColormap ? "       colormap = texture2D(texture_colorMap, $UV);\n" : "") +
        "     vec3 texel0 = texture2D(texture_channel0, vUv0 * terrain_tile).rgb;\n" +
        "     vec3 texel1 = texture2D(texture_channel1, vUv0 * terrain_tile).rgb;\n" +
        "     vec3 texel2 = texture2D(texture_channel2, vUv0 * terrain_tile).rgb;\n" +
        (this.useAlpha ? " vec3 texel3 = texture2D(texture_channel3, vUv0 * terrain_tile).rgb\n;" : "") +
        "     dAlbedo = gammaCorrectInput(addAlbedoDetail(colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 " +
        (this.useAlpha ? "+ colormap.a * texel3" : "") +
        "));\n" +
        (useOcclusion ? "   vec3 occlusion = texture2D( texture_occlusion, vUv0).rgb;\ndAlbedo *= occlusion;\n" : "") +
        "  }\n");
};
UranusTerrainSplatmaps.prototype.getNormalShader = function (calcColormap) {
    return (" uniform sampler2D normalMap_channel0;\n" +
        " uniform sampler2D normalMap_channel1;\n" +
        " uniform sampler2D normalMap_channel2;\n" +
        " uniform sampler2D normalMap_channel3;\n" +
        " uniform float material_bumpiness;\n" +
        " void getNormal() {\n" +
        (calcColormap ? "   colormap = texture2D(texture_colorMap, vUv0);\n" : "") +
        "   vec3 texel0 = unpackNormal(texture2D(normalMap_channel0, vUv0  * terrain_tile + dUvOffset));\n" +
        "   vec3 texel1 = unpackNormal(texture2D(normalMap_channel1, vUv0  * terrain_tile + dUvOffset));\n" +
        "   vec3 texel2 = unpackNormal(texture2D(normalMap_channel2, vUv0  * terrain_tile + dUvOffset));\n" +
        "   vec3 texel3 = unpackNormal(texture2D(normalMap_channel3, vUv0  * terrain_tile + dUvOffset));\n" +
        "   vec3 normalMap = colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 + colormap.a * texel3;\n" +
        "   dNormalMap = addNormalDetail(normalMap);\n" +
        "   normalMap = mix(vec3(0.0, 0.0, 1.0), normalMap, material_bumpiness);\n" +
        "   dNormalW = dTBN * normalMap;\n" +
        "}\n");
};
UranusTerrainSplatmaps.prototype.getParallaxShader = function (calcColormap) {
    return (" uniform sampler2D heightMap_channel0;\n" +
        " uniform sampler2D heightMap_channel1;\n" +
        " uniform sampler2D heightMap_channel2;\n" +
        " uniform sampler2D heightMap_channel3;\n" +
        " uniform float material_heightMapFactor;\n" +
        " void getParallax() {\n" +
        "   float parallaxScale = material_heightMapFactor;\n" +
        (calcColormap ? "   colormap = texture2D(texture_colorMap, vUv0);\n" : "") +
        "   float texel0 = texture2D(heightMap_channel0, vUv0  * terrain_tile).$CH;\n" +
        "   float texel1 = texture2D(heightMap_channel1, vUv0  * terrain_tile).$CH;\n" +
        "   float texel2 = texture2D(heightMap_channel2, vUv0  * terrain_tile).$CH;\n" +
        "   float texel3 = texture2D(heightMap_channel3, vUv0  * terrain_tile).$CH;\n" +
        "   float height = colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 + colormap.a * texel3;\n" +
        "   height = height * parallaxScale - parallaxScale*0.5;\n" +
        "   vec3 viewDirT = dViewDirW * dTBN;\n" +
        "   viewDirT.z += 0.42;\n" +
        "   dUvOffset = height * (viewDirT.xy / viewDirT.z);\n" +
        "}\n");
};
UranusTerrainSplatmaps.prototype.loadTerrainAssets = function (assets) {
    return new Promise(function (resolve) {
        // --- load the assets
        var count = 0;
        assets.forEach(function (assetToLoad) {
            assetToLoad.ready(function () {
                count++;
                if (count === assets.length) {
                    resolve();
                }
            });
            this.app.assets.load(assetToLoad);
        }.bind(this));
    }.bind(this));
};
