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
// LOD spawn entity as a single one, not a list
// https://stackoverflow.com/questions/19553448/typedarray-set-vs-unrolled-loop-javascript
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
UranusEditorEntitiesPaint.attributes.add("removeComponents", {
    type: "string",
    default: "model",
    title: "Remove Components",
    description: "A comma separated list of entity compoments to be removed when spawning an instance. When using HW instancing the model component should be removed.",
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
UranusEditorEntitiesPaint.attributes.add("densityReduce", {
    type: "number",
    default: 0,
    title: "Density Reduce",
    min: 0,
    precision: 0,
    description: "Number of instances to be skipped for each instance rendered, useful to increase the performance in lower end devices.",
});
UranusEditorEntitiesPaint.attributes.add("densityDistance", {
    type: "number",
    default: 0,
    title: "Density Distance",
    min: 0,
    description: "The distance from the culling camera at which density reduce will be applied.",
});
UranusEditorEntitiesPaint.attributes.add("isStatic", {
    type: "boolean",
    default: false,
    title: "Is Static",
    description: "When hardware instancing is enabled, checking this flag will provide a performance increase since no translations will be updated on runtime.",
});
UranusEditorEntitiesPaint.prototype.initialize = function () {
    this.vec = new pc.Vec3();
    this.vec1 = new pc.Vec3();
    this.vec2 = new pc.Vec3();
    this.quat = new pc.Quat();
    this.tempSphere = { center: null, radius: 0.5 };
    this.lodDistance = [
        this.lodLevels.x * this.lodLevels.x,
        this.lodLevels.y * this.lodLevels.y,
        this.lodLevels.z * this.lodLevels.z,
    ];
    this.densityDistanceSq = this.densityDistance * this.densityDistance;
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
    this.loadStreamingData().then(function (streamingData) {
        this.streamingData = streamingData;
        if (this.hardwareInstancing) {
            this.enableHardwareInstancing();
            this.updateHardwareInstancing();
        }
    }.bind(this));
    // --- events
    this.on("attr", this.editorAttrChange, this);
    this.on("state", function (enabled) {
        if (this.hardwareInstancing) {
            if (enabled) {
                this.enableHardwareInstancing();
                this.updateHardwareInstancing();
            }
            else {
                this.clearInstances();
            }
        }
    }, this);
};
UranusEditorEntitiesPaint.prototype.update = function (dt) {
    if (this.hardwareInstancing) {
        // const p1 = performance.now();
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
    this.matrix = new pc.Mat4();
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
    // --- if HW instancing is enabled we automatically add model in the list, if it's not
    if (this.hardwareInstancing &&
        this.componentsToClear.indexOf("model") === -1) {
        this.componentsToClear.push("model");
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
        this.streamingData = this.loadStreamingData();
    }
    if (property === "hardwareInstancing") {
        this.enableHardwareInstancing();
    }
    if (this.cullingCamera && property === "hideAfter") {
        var hideAfter = value;
        this.hiddenCamera.camera.farClip =
            hideAfter > 0 ? hideAfter : this.cullingCamera.camera.farClip;
        if (this.hardwareInstancing) {
            this.updateHardwareInstancing();
        }
    }
    if (property === "lodLevels") {
        this.lodDistance = [
            value.x * value.x,
            value.y * value.y,
            value.z * value.z,
        ];
    }
    if (property === "densityDistance") {
        this.densityDistanceSq = value * value;
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
        this.updateHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.onHistoryRedo = function () {
    // --- update renderer if required
    if (this.hardwareInstancing) {
        this.updateHardwareInstancing();
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
    // ToDo run batcher
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
        this.updateHardwareInstancing();
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
            var a = Math.random();
            var b = Math.random();
            this.randomPosition.x =
                this.currentPosition.x +
                    b * this.brushRadius * Math.cos((2 * Math.PI * a) / b);
            this.randomPosition.z =
                this.currentPosition.z +
                    b * this.brushRadius * Math.sin((2 * Math.PI * a) / b);
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
        this.updateHardwareInstancing();
    }
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
                if (!removeEntity ||
                    removeEntity.get("tags").indexOf("uranus-lod-entity") === -1)
                    return;
                editor.call("entities:removeEntity", removeEntity);
            });
        }
    }
    // --- scale them up
    var scale = this.vec.copy(referenceEntity.getLocalScale());
    var newScaleFactor = pc.math.random(this.scaleMinMax.x, this.scaleMinMax.y);
    scale.scale(newScaleFactor);
    // --- rotate or align them
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
    // --- position + offset
    var offset = this.vec2.copy(this.posOffset);
    // --- if required project offset to scale
    if (this.projectOffset) {
        offset.x *= scale.x;
        offset.y *= scale.y;
        offset.z *= scale.z;
    }
    if (!this.streamingFile) {
        item.history.enabled = false;
        item.set("enabled", true);
        item.set("position", [
            position.x + offset.x,
            position.y + offset.y,
            position.z + offset.z,
        ]);
        item.set("rotation", [angles.x, angles.y, angles.z]);
        item.set("scale", [scale.x, scale.y, scale.z]);
        item.history.enabled = true;
    }
    else {
        // --- save streaming info
        this.streamingData.push(bankIndex);
        this.streamingData.push(this.roundNumber(position.x + offset.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(position.y + offset.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(position.z + offset.z, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(angles.z, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.x, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.y, this.streamingPrecision));
        this.streamingData.push(this.roundNumber(scale.z, this.streamingPrecision));
    }
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
        this.updateHardwareInstancing();
    }
};
UranusEditorEntitiesPaint.prototype.clearInstances = function () {
    if (!this.meshInstances) {
        return;
    }
    this.meshInstances.forEach(function (meshInstance) {
        if (meshInstance.instancingData &&
            meshInstance.instancingData.vertexBuffer) {
            meshInstance.instancingData.vertexBuffer.destroy();
        }
        meshInstance.setInstancing();
        meshInstance.cullingData = undefined;
    });
};
UranusEditorEntitiesPaint.prototype.enableHardwareInstancing = function () {
    this.spawnEntities =
        this.spawnEntity.children[0] instanceof pc.Entity
            ? this.spawnEntity.children
            : [this.spawnEntity];
    this.lodEntities = {};
    // --- loop through the materials of the spawn entity and enable hw instancing
    var materials = [];
    this.spawnEntities.forEach(function (spawnEntity) {
        if (this.useLOD === false && !spawnEntity.model)
            return true;
        if (this.useLOD === true && spawnEntity.children.length === 0)
            return true;
        var entities;
        if (this.useLOD === true) {
            entities = [];
            spawnEntity.children.forEach(function (child) {
                if (this.isLodEntity(child)) {
                    entities.push(child);
                }
            }.bind(this));
        }
        else {
            entities = [spawnEntity];
        }
        entities.forEach(function (lodEntity) {
            if (lodEntity.model) {
                lodEntity.model.meshInstances.forEach(function (meshInstance) {
                    materials.push(meshInstance.material);
                }.bind(this));
            }
        }.bind(this));
    }.bind(this));
    materials.forEach(function (material) {
        if (this.hardwareInstancing) {
            material.onUpdateShader = function (options) {
                options.useInstancing = true;
                return options;
            };
        }
        else {
            material.onUpdateShader = undefined;
            meshInstance.setInstancing();
        }
        material.update();
    }.bind(this));
};
UranusEditorEntitiesPaint.prototype.updateHardwareInstancing = function () {
    var matrix = new pc.Mat4();
    var spawnEntities = this.spawnEntities;
    this.cells = {};
    this.meshInstances = [];
    var count = 0;
    spawnEntities.forEach(function (spawnEntity, spawnEntityIndex) {
        if (this.useLOD === false && !spawnEntity.model)
            return true;
        if (this.useLOD === true && spawnEntity.children.length === 0)
            return true;
        var entities;
        if (this.useLOD === true) {
            entities = [];
            spawnEntity.children.forEach(function (child) {
                if (this.isLodEntity(child)) {
                    entities.push(child);
                }
            }.bind(this));
        }
        else {
            entities = [spawnEntity];
        }
        this.lodEntities[spawnEntity._guid] = entities;
        // --- calculate number of instances
        var instances = this.filterInstances(spawnEntity, spawnEntityIndex);
        if (instances.length === 0) {
            // --- if no instances, and we have a vertex buffer, clear it
            entities.forEach(function (lodEntity) {
                if (!lodEntity.model)
                    return true;
                lodEntity.model.meshInstances.forEach(function (meshInstance) {
                    if (meshInstance.instancingData &&
                        meshInstance.instancingData.vertexBuffer) {
                        meshInstance.instancingData.vertexBuffer.destroy();
                    }
                    meshInstance.setInstancing();
                    meshInstance.cullingData = undefined;
                });
            });
            return true;
        }
        entities.forEach(function (lodEntity, lodIndex) {
            if (!lodEntity.model)
                return true;
            var spawnScale = lodEntity.getLocalScale();
            lodEntity.model.meshInstances.forEach(function (meshInstance, meshInstanceIndex) {
                // --- calculate pivot offset
                var offset = this.vec
                    .copy(meshInstance.aabb.center)
                    .sub(spawnEntity.getPosition());
                offset.x /= spawnScale.x;
                offset.y /= spawnScale.y;
                offset.z /= spawnScale.z;
                // --- store matrices for individual instances into array
                var matrices = new Float32Array(instances.length * 16);
                var matricesList = [];
                var boundingsOriginal = [];
                var cellsList = [];
                var matrixIndex = 0;
                for (var i = 0; i < instances.length; i++) {
                    var instance = this.getInstanceData(instances[i], spawnEntities);
                    // --- check if we are interested in this mesh instance
                    if (instance.name !== spawnEntity.name)
                        continue;
                    var scale = this.vec2
                        .copy(instance.scale)
                        .mul(spawnScale)
                        .scale(0.01);
                    // --- calculate pivot point position
                    this.vec1.copy(instance.position);
                    this.vec1.x += offset.x * scale.x;
                    this.vec1.y += offset.y * scale.y;
                    this.vec1.z += offset.z * scale.z;
                    // --- calculate angles
                    this.quat
                        .copy(instance.rotation)
                        .mul(meshInstance.node.getRotation());
                    // --- calculate instance matrix
                    matrix.setTRS(this.vec1, this.quat, scale);
                    // copy matrix elements into array of floats
                    for (var m = 0; m < 16; m++) {
                        matrices[matrixIndex] = matrix.data[m];
                        matrixIndex++;
                    }
                    // --- save culling data
                    matricesList[i] = matrix.clone();
                    var bounding = new pc.BoundingSphere(this.vec1.clone(), meshInstance._aabb.halfExtents.length() * 2);
                    boundingsOriginal[i] = bounding;
                    // --- add instance to cell
                    if (lodIndex === 0) {
                        var cellPos = new pc.Vec3();
                        this.getCellPos(cellPos, instance.position);
                        var cellGuid = this.getCellGuid(cellPos);
                        if (!this.cells[cellGuid]) {
                            var halfExtents = this.vec1.copy(this.cellSize).scale(2);
                            this.cells[cellGuid] = new pc.BoundingBox(cellPos.clone(), halfExtents.clone());
                            this.cells[cellGuid].sphere = new pc.BoundingSphere(cellPos.clone(), this.cellSize.x * 1.5);
                        }
                        cellsList[i] = this.cells[cellGuid];
                        if (meshInstanceIndex === 0) {
                            count++;
                        }
                    }
                }
                // --- create the vertex buffer
                if (meshInstance.instancingData &&
                    meshInstance.instancingData.vertexBuffer) {
                    meshInstance.instancingData.vertexBuffer.destroy();
                }
                var renderInitial = false;
                if (this.useLOD === false ||
                    (this.useLOD === true && lodIndex === 0)) {
                    renderInitial = true;
                }
                var vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, pc.VertexFormat.defaultInstancingFormat, renderInitial ? instances.length : 0, pc.BUFFER_STATIC, renderInitial ? matrices : new Float32Array());
                meshInstance.setInstancing(vertexBuffer);
                meshInstance.cullingData = {
                    lodIndex: lodIndex,
                    instances: instances,
                    boundings: boundingsOriginal,
                    culledList: this.useLOD && lodIndex === 0 ? [] : undefined,
                    distances: this.useLOD && lodIndex === 0 ? [] : undefined,
                    matrices: matrices.slice(0),
                    matricesList: matricesList,
                    cellsList: cellsList,
                };
                this.meshInstances.push(meshInstance);
            }.bind(this));
        }.bind(this));
    }.bind(this));
    console.log(this.entity.name, "instances", count);
};
UranusEditorEntitiesPaint.prototype.cullHardwareInstancing = function () {
    var cullingEnabled = this.cullingCamera && this.cullingCamera.camera;
    if (!cullingEnabled && !this.useLOD && this.isStatic === true) {
        return;
    }
    var app = this.app;
    var spawnEntities = this.spawnEntities;
    var isStatic = this.isStatic === true || this.streamingFile === undefined;
    var useLOD = this.useLOD;
    var vec = this.vec;
    var vec1 = this.vec1;
    var vec2 = this.vec2;
    var quat = this.quat;
    var lodDistance = this.lodDistance;
    var lodEntities = this.lodEntities;
    var hideAfter = this.hideAfter;
    var perInstanceCull = this.perInstanceCull;
    var densityReduce = this.densityReduce;
    var densityDistance = this.densityDistanceSq;
    var self = this;
    var frustum = cullingEnabled ? this.cullingCamera.camera.frustum : null;
    var cameraPos = cullingEnabled ? this.cullingCamera.getPosition() : null;
    // --- use custom culling, if required
    if (this.hiddenCamera && hideAfter > 0) {
        this.hiddenCamera.setPosition(cameraPos);
        this.hiddenCamera.setRotation(this.cullingCamera.getRotation());
        app.renderer.updateCameraFrustum(this.hiddenCamera.camera.camera);
        frustum = this.hiddenCamera.camera.frustum;
    }
    // --- update visibility cells
    if (this.cells) {
        for (var cellGuid in this.cells) {
            var cell = this.cells[cellGuid];
            cell.isVisible = frustum.containsSphere(cell.sphere);
            cell.distanceFromCamera = self.distanceSq(cameraPos, cell.center);
        }
    }
    for (var a = 0; a < spawnEntities.length; a++) {
        var spawnEntity = spawnEntities[a];
        if (useLOD === false && !spawnEntity.model)
            continue;
        if (useLOD === true && spawnEntity.children.length === 0)
            continue;
        var entities = lodEntities[spawnEntity._guid];
        if (!entities)
            continue;
        for (var lodIndex = 0; lodIndex < entities.length; lodIndex++) {
            var lodEntity = entities[lodIndex];
            var spawnScale = lodEntity.getLocalScale();
            for (var meshInstanceIndex = 0; meshInstanceIndex < lodEntity.model.meshInstances.length; meshInstanceIndex++) {
                var meshInstance = lodEntity.model.meshInstances[meshInstanceIndex];
                if (!meshInstance.cullingData)
                    continue;
                // --- check if we will be updating translations
                if (isStatic === false) {
                    // --- calculate pivot offset
                    var offset = vec
                        .copy(meshInstance.aabb.center)
                        .sub(spawnEntity.getPosition());
                    offset.x /= spawnScale.x;
                    offset.y /= spawnScale.y;
                    offset.z /= spawnScale.z;
                }
                var instances = meshInstance.cullingData.instances;
                var boundings = meshInstance.cullingData.boundings;
                var matrices = meshInstance.cullingData.matrices;
                var matricesList = meshInstance.cullingData.matricesList;
                // --- find visible instances
                var visibleCount = 0;
                var matrixIndex = 0;
                var visible = 0;
                var activeDensity = densityReduce;
                var cellsList = entities[0].model.meshInstances[meshInstanceIndex].cullingData
                    .cellsList;
                var culledList = entities[0].model.meshInstances[meshInstanceIndex].cullingData
                    .culledList;
                for (var i = 0; i < instances.length; i++) {
                    var cell = cellsList[i];
                    activeDensity++;
                    if (cell.distanceFromCamera >= densityDistance &&
                        activeDensity <= densityReduce) {
                        continue;
                    }
                    activeDensity = 0;
                    var bounding = boundings[i];
                    // --- check first if the containing cell is visible
                    if (perInstanceCull === false && hideAfter > 0) {
                        visible = cell.isVisible;
                    }
                    else {
                        visible = 1;
                    }
                    // --- frustum culling
                    if (perInstanceCull === true && visible > 0) {
                        visible = cullingEnabled
                            ? lodIndex === 0
                                ? frustum.containsSphere(bounding)
                                : culledList[i]
                            : 0;
                    }
                    // --- if LOD is used, we have a last step before rendering this instance: check if it's the active LOD
                    if (useLOD === true) {
                        if (lodIndex === 0) {
                            culledList[i] = visible;
                        }
                        if (visible > 0) {
                            var instanceLodIndex = meshInstance.cullingData.lodIndex;
                            var distanceFromCamera = lodIndex === 0
                                ? self.distanceSq(cameraPos, bounding.center)
                                : entities[0].model.meshInstances[meshInstanceIndex]
                                    .cullingData.distances[i];
                            // --- save check for later LOD levels
                            if (lodIndex === 0) {
                                meshInstance.cullingData.distances[i] = distanceFromCamera;
                            }
                            var activeLodIndex = 0;
                            if (distanceFromCamera >= lodDistance[0] &&
                                distanceFromCamera < lodDistance[1]) {
                                activeLodIndex = 1;
                            }
                            else if (distanceFromCamera >= lodDistance[1] &&
                                distanceFromCamera < lodDistance[2]) {
                                activeLodIndex = 2;
                            }
                            else if (distanceFromCamera >= lodDistance[2]) {
                                activeLodIndex = 3;
                            }
                            if (instanceLodIndex !== activeLodIndex) {
                                visible = 0;
                            }
                        }
                    }
                    if (visible > 0) {
                        visibleCount++;
                        var matrix = matricesList[i];
                        // --- check if we will be updating translations
                        if (isStatic === false) {
                            var instance = instances[i];
                            var scale = vec2
                                .copy(instance.getLocalScale())
                                .mul(spawnScale)
                                .scale(0.01);
                            // --- calculate pivot point position
                            vec1.copy(instance.getPosition());
                            vec1.x += offset.x * scale.x;
                            vec1.y += offset.y * scale.y;
                            vec1.z += offset.z * scale.z;
                            // --- calculate angles
                            quat
                                .copy(instance.getRotation())
                                .mul(meshInstance.node.getRotation());
                            // --- calculate instance matrix
                            matrix.setTRS(vec1, quat, scale);
                        }
                        for (var m = 0; m < 16; m++) {
                            matrices[matrixIndex] = matrix.data[m];
                            matrixIndex++;
                        }
                    }
                }
                var subarray = matrices.subarray(0, matrixIndex);
                // --- update the vertex buffer, by replacing the current one (uses the same bufferId)
                var vertexBuffer = meshInstance.instancingData.vertexBuffer;
                // stats update
                app.graphicsDevice._vram.vb -= vertexBuffer.numBytes;
                var format = vertexBuffer.format;
                vertexBuffer.numBytes = format.verticesByteSize
                    ? format.verticesByteSize
                    : format.size * visibleCount;
                // stats update
                app.graphicsDevice._vram.vb += vertexBuffer.numBytes;
                vertexBuffer.setData(subarray);
                meshInstance.instancingData.count = visibleCount;
                vertexBuffer.numVertices = visibleCount;
            }
        }
    }
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
UranusEditorEntitiesPaint.prototype.isLodEntity = function (entity) {
    if (Uranus.Editor.inEditor()) {
        var item = editor.call("entities:get", entity._guid);
        if (!item) {
            return false;
        }
        return item.get("tags").indexOf("uranus-lod-entity") > -1;
    }
    else {
        return entity.tags.has("uranus-lod-entity");
    }
};
UranusEditorEntitiesPaint.prototype.roundNumber = function (x, base) {
    // base can be 1e3, 1e3 etc
    return Math.round(x * base) / base;
};
UranusEditorEntitiesPaint.prototype.loadStreamingData = function () {
    return new Promise(function (resolve) {
        if (this.streamingFile) {
            var onLoad = function () {
                var data = Array.isArray(this.streamingFile.resources) &&
                    this.streamingFile.resources.length >= 10
                    ? this.streamingFile.resources
                    : [];
                resolve(data);
            }.bind(this);
            if (this.streamingFile.loaded) {
                onLoad();
            }
            else {
                this.streamingFile.ready(onLoad);
                this.app.assets.load(this.streamingFile);
            }
        }
        else {
            resolve([]);
        }
    }.bind(this));
};
UranusEditorEntitiesPaint.prototype.saveStreamingData = function () {
    var url = "https://playcanvas.com/api/assets/" + this.streamingFile.id;
    var form = new FormData();
    form.append("name", "" + this.streamingFile.name);
    form.append("file", new Blob([JSON.stringify(this.streamingData)]), this.streamingFile.name);
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
                return child.name === spawnEntity.name;
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
UranusEditorEntitiesPaint.prototype.getInstanceData = function (pointer, spawnEntities) {
    if (!this.streamingFile) {
        var entity = pointer;
        this.instanceData.name = entity.name;
        this.instanceData.position.copy(entity.getPosition());
        this.instanceData.rotation.copy(entity.getRotation());
        this.instanceData.scale.copy(entity.getLocalScale());
    }
    else {
        var data = this.streamingData;
        this.instanceData.name = spawnEntities
            ? spawnEntities[data[pointer]].name
            : undefined;
        this.instanceData.position.set(data[pointer + 1], data[pointer + 2], data[pointer + 3]);
        this.instanceData.rotation.setFromEulerAngles(data[pointer + 4], data[pointer + 5], data[pointer + 6]);
        this.instanceData.scale.set(data[pointer + 7], data[pointer + 8], data[pointer + 9]);
    }
    return this.instanceData;
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
    this.blurSamples = 5;
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
        "}");
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
// initialize code called once per entity
UranusTerrainGenerateHeightmap.prototype.initialize = function () {
    this.heightMap.ready(this.createTerrain.bind(this));
    this.app.assets.load(this.heightMap);
};
UranusTerrainGenerateHeightmap.prototype.createTerrain = function () {
    var img = this.heightMap.resource.getSource();
    var renderModel = this.createTerrainFromHeightMap(img, this.subdivisions).then(function (renderModel) {
        var layers = [this.app.scene.layers.getLayerByName("World").id];
        // --- check if we have a waves layer
        var layerWaves = this.app.scene.layers.getLayerByName("WaveSources");
        if (layerWaves) {
            layers.push(layerWaves.id);
        }
        this.entity.addComponent("model", {
            layers: layers,
            castShadows: true,
            receiveShadows: true,
        });
        this.entity.model.model = renderModel;
        this.app.fire("water:render");
        this.app.fire("splatmaps:render");
        if (this.addCollision) {
            this.entity.addComponent("collision", {
                type: "mesh",
            });
            this.entity.collision.model = renderModel;
            this.entity.addComponent("rigidbody", {
                friction: 0.5,
                type: "static",
            });
        }
        this.app.fire("terrain:ready");
    }.bind(this));
};
UranusTerrainGenerateHeightmap.prototype.createTerrainVertexData = function (options) {
    var positions = [];
    var uvs = [];
    var indices = [];
    var row, col;
    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            var position = new pc.Vec3((col * options.width) / options.subdivisions - options.width / 2.0, 0, ((options.subdivisions - row) * options.height) / options.subdivisions -
                options.height / 2.0);
            var heightMapX = (((position.x + options.width / 2) / options.width) *
                (options.bufferWidth - 1)) |
                0;
            var heightMapY = ((1.0 - (position.z + options.height / 2) / options.height) *
                (options.bufferHeight - 1)) |
                0;
            var pos = (heightMapX + heightMapY * options.bufferWidth) * 4;
            var r = options.buffer[pos] / 255.0;
            var g = options.buffer[pos + 1] / 255.0;
            var b = options.buffer[pos + 2] / 255.0;
            var gradient = r * 0.3 + g * 0.59 + b * 0.11;
            position.y =
                options.minHeight + (options.maxHeight - options.minHeight) * gradient;
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
    };
};
UranusTerrainGenerateHeightmap.prototype.createTerrainFromHeightMap = function (img, subdivisions) {
    return new Promise(function (resolve) {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        var bufferWidth = img.width;
        var bufferHeight = img.height;
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
        context.drawImage(img, 0, 0);
        var buffer = context.getImageData(0, 0, bufferWidth, bufferHeight).data;
        var vertexData = this.createTerrainVertexData({
            width: this.width,
            height: this.depth,
            subdivisions: subdivisions,
            minHeight: this.minHeight,
            maxHeight: this.maxHeight,
            buffer: buffer,
            bufferWidth: bufferWidth,
            bufferHeight: bufferHeight,
        });
        var node = new pc.GraphNode();
        this.material.ready(function () {
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
            resolve(model);
        }.bind(this));
        this.app.assets.load(this.material);
    }.bind(this));
};
var UranusTerrainSplatmaps = pc.createScript("uranusTerrainSplatmaps");
UranusTerrainSplatmaps.attributes.add("inEditor", {
    type: "boolean",
    default: true,
    title: "In Editor",
});
UranusTerrainSplatmaps.attributes.add("materialAsset", {
    type: "asset",
    assetType: "material",
});
UranusTerrainSplatmaps.attributes.add("colormap", {
    type: "asset",
    assetType: "texture",
    title: "Colormap",
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
UranusTerrainSplatmaps.attributes.add("useAlpha", {
    type: "boolean",
    default: true,
});
UranusTerrainSplatmaps.attributes.add("tiling", {
    type: "number",
    default: 1,
});
// initialize code called once per entity
UranusTerrainSplatmaps.prototype.initialize = function () {
    this.app.on("splatmaps:render", this.render, this);
    this.on("attr", this.onAttrUpdate, this);
    this.on("destroy", this.onDestroy, this);
};
UranusTerrainSplatmaps.prototype.onAttrUpdate = function (property, state) {
    this.updateUniforms();
};
UranusTerrainSplatmaps.prototype.onDestroy = function () {
    this.app.off("splatmaps:render", this.render, this);
};
UranusTerrainSplatmaps.prototype.render = function () {
    var material = this.materialAsset.resource;
    this.material = material;
    material.chunks.diffusePS = this.getSplatmapDiffuseShader(this.useAlpha);
    material.update();
    this.updateUniforms();
};
UranusTerrainSplatmaps.prototype.updateUniforms = function () {
    this.material.setParameter("texture_colorMap", this.colormap.resource);
    this.material.setParameter("texture_channel0", this.textureChannel0.resource.diffuseMap);
    this.material.setParameter("texture_channel1", this.textureChannel1.resource.diffuseMap);
    this.material.setParameter("texture_channel2", this.textureChannel2.resource.diffuseMap);
    if (this.useAlpha) {
        this.material.setParameter("texture_channel3", this.textureChannel3.resource.diffuseMap);
    }
    this.material.setParameter("tile", this.tiling);
};
UranusTerrainSplatmaps.prototype.getSplatmapDiffuseShader = function (useAlpha) {
    return ("   uniform sampler2D texture_colorMap;" +
        "   uniform float tile;" +
        "   uniform sampler2D texture_channel0;" +
        "   uniform sampler2D texture_channel1;" +
        "   uniform sampler2D texture_channel2;" +
        "   uniform sampler2D texture_channel3;" +
        "   void getAlbedo() {" +
        "       vec4 colormap = texture2D(texture_colorMap, vUv0);" +
        "       vec3 texel0 = texture2D(texture_channel0, vUv0 * tile).rgb;" +
        "       vec3 texel1 = texture2D(texture_channel1, vUv0 * tile).rgb;" +
        "       vec3 texel2 = texture2D(texture_channel2, vUv0 * tile).rgb;" +
        (useAlpha
            ? "       vec3 texel3 = texture2D(texture_channel3, vUv0 * tile).rgb;"
            : "") +
        "       dAlbedo = gammaCorrectInput(colormap.r * texel0 + colormap.g * texel1 + colormap.b * texel2 " +
        (useAlpha ? "+ colormap.a * texel3" : "") +
        ");" +
        "  }");
};
