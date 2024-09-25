// https://github.com/kuroni/bongocat-osu/blob/master/src/osu.cpp

function bezier(ratio, points, length) {
    let fact = [0.001, 0.001, 0.002, 0.006, 0.024, 0.12, 0.72, 5.04, 40.32, 362.88, 3628.8, 39916.8, 479001.6, 6227020.8, 87178291.2, 1307674368.0, 20922789888.0, 355687428096.0, 6402373705728.0, 121645100408832.0, 2432902008176640.0, 51090942171709440.0];
    let nn = (length / 2) - 1;
    let xx = 0;
    let yy = 0;
    for (let point = 0; point <= nn; point++) {
        let tmp = fact[nn] / (fact[point] * fact[nn - point]) * Math.pow(ratio, point) * Math.pow(1 - ratio, nn - point);
        xx += points[2 * point] * tmp;
        yy += points[2 * point + 1] * tmp;
    }
    return [xx / 1000, yy / 1000];
}

function get_xy(mouseX, mouseY, resX, resY) {
    let fx = (1.0 * mouseX) / resX;
    let fy = (1.0 * mouseY) / resY;
    fx = Math.min(fx, 1.0);
    fx = Math.max(fx, 0.0);
    fy = Math.min(fy, 1.0);
    fy = Math.max(fy, 0.0);
    let x = -97 * fx + 44 * fy + 184;
    let y = -76 * fx - 40 * fy + 324;
    return [x, y];
}

function drawArm(mouseX, mouseY, resX, resY, ctx, mouseImg) {
    let [x, y] = get_xy(mouseX, mouseY, resX, resY);

    let paw_r = 255;
    let paw_g = 255;
    let paw_b = 255;
    let paw_a = 255;

    let paw_edge_r = 0;
    let paw_edge_g = 0;
    let paw_edge_b = 0;
    let paw_edge_a = 255;

    let shad = paw_edge_a / 3;

    const hypot = Math.hypot;

    // initializing pss and pss2 (kuvster's magic)
    let oof = 6;
    let pss = [211.0, 159.0];
    let dist = hypot(211 - x, 159 - y);
    let centreleft0 = 211 - 0.7237 * dist / 2;
    let centreleft1 = 159 + 0.69 * dist / 2;
    for (let i = 1; i < oof; i++) {
        let bez = [211, 159, centreleft0, centreleft1, x, y];
        [p0, p1] = bezier(1.0 * i / oof, bez, 6);
        pss.push(p0);
        pss.push(p1);
    }
    pss.push(x);
    pss.push(y);
    let a = y - centreleft1;
    let b = centreleft0 - x;
    let le = hypot(a, b);
    a = x + a / le * 60;
    b = y + b / le * 60;
    let a1 = 258;
    let a2 = 228;
    dist = hypot(a1 - a, a2 - b);
    let centreright0 = a1 - 0.6 * dist / 2;
    let centreright1 = a2 + 0.8 * dist / 2;
    let push = 20;
    let s = x - centreleft0;
    let t = y - centreleft1;
    le = hypot(s, t);
    s *= push / le;
    t *= push / le;
    let s2 = a - centreright0;
    let t2 = b - centreright1;
    le = hypot(s2, t2);
    s2 *= push / le;
    t2 *= push / le;
    for (let i = 1; i < oof; i++) {
        bez = [x, y, x + s, y + t, a + s2, b + t2, a, b];
        [p0, p1] = bezier(1.0 * i / oof, bez, 8);
        pss.push(p0);
        pss.push(p1);
    }
    pss.push(a);
    pss.push(b);
    for (let i = oof - 1; i > 0; i--) {
        bez = [1.0 * a1, 1.0 * a2, centreright0, centreright1, a, b];
        [p0, p1] = bezier(1.0 * i / oof, bez, 6);
        pss.push(p0);
        pss.push(p1);
    }
    pss.push(a1);
    pss.push(a2);
    let mpos0 = (a + x) / 2 - 52 - 15;
    let mpos1 = (b + y) / 2 - 34 + 5;
    let dx = -38;
    let dy = -50;

    const iter = 25;

    pss2 = [pss[0] + dx, pss[1] + dy];
    for (let i = 1; i < iter; i++) {
        [p0, p1] = bezier(1.0 * i / iter, pss, 38);
        pss2.push(p0 + dx);
        pss2.push(p1 + dy);
    }
    pss2.push(pss[36] + dx);
    pss2.push(pss[37] + dy);

    // draw mouse
    ctx.drawImage(mouseImg, mpos0 + dx, mpos1 + dy);

    // drawing arms
    let fill = [];
    for (let i = 0; i < 26; i += 2) {
        fill.push([pss2[i], pss2[i + 1]]);
        fill.push([pss2[52 - i - 2], pss2[52 - i - 1]]);
    }

    ctx.beginPath();
    ctx.fillStyle = 'rgba(' + paw_r + ', ' + paw_g + ', ' + paw_b + ', ' + paw_a + ')';
    let curr = fill[0];
    let nex1 = fill[1];
    let nex2 = fill[2];
    for (let i = 0; i < fill.length - 2; i++) {
        ctx.moveTo(curr[0], curr[1]);
        ctx.lineTo(nex1[0], nex1[1]);
        ctx.lineTo(nex2[0], nex2[1]);
        ctx.lineTo(curr[0], curr[1]);
        curr = fill[i + 1];
        nex1 = fill[i + 2];
        nex2 = fill[i + 3];
    }
    ctx.fill();

    // drawing first arm arc
    let edge = [];
    let width = 6;
    ctx.beginPath();
    ctx.arc(pss2[0], pss2[1], width / 2 - 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + shad + ')';
    ctx.fill();
    for (let i = 0; i < 50; i += 2) {
        let vec0 = pss2[i] - pss2[i + 2];
        let vec1 = pss2[i + 1] - pss2[i + 3];
        let dist = hypot(vec0, vec1);
        edge.push([pss2[i] + vec1 / dist * width / 2, pss2[i + 1] - vec0 / dist * width / 2]);
        edge.push([pss2[i] - vec1 / dist * width / 2, pss2[i + 1] + vec0 / dist * width / 2]);
        width -= 0.08;
    }
    let vec0 = pss2[50] - pss2[48];
    let vec1 = pss2[51] - pss2[49];
    dist = hypot(vec0, vec1);
    edge[51] = [pss2[50] + vec1 / dist * width / 2, pss2[51] - vec0 / dist * width / 2];
    edge[50] = [pss2[50] - vec1 / dist * width / 2, pss2[51] + vec0 / dist * width / 2];

    ctx.beginPath();
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + shad + ')';
    curr = edge[0];
    nex1 = edge[1];
    nex2 = edge[2];
    for (let i = 0; i < edge.length - 2; i++) {
        ctx.moveTo(curr[0], curr[1]);
        ctx.lineTo(nex1[0], nex1[1]);
        ctx.lineTo(nex2[0], nex2[1]);
        ctx.lineTo(curr[0], curr[1]);
        curr = edge[i + 1];
        nex1 = edge[i + 2];
        nex2 = edge[i + 3];
    }
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pss2[50], pss2[51], width / 2 - 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + shad + ')';
    ctx.fill();

    // drawing second arm arc
    let edge2 = [];
    width = 6;
    ctx.beginPath();
    ctx.arc(pss2[0], pss2[1], width / 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + paw_edge_a + ')';
    ctx.fill();
    for (let i = 0; i < 50; i += 2) {
        vec0 = pss2[i] - pss2[i + 2];
        vec1 = pss2[i + 1] - pss2[i + 3];
        let dist = hypot(vec0, vec1);
        edge2.push([pss2[i] + vec1 / dist * width / 2, pss2[i + 1] - vec0 / dist * width / 2]);
        edge2.push([pss2[i] - vec1 / dist * width / 2, pss2[i + 1] + vec0 / dist * width / 2]);
        width -= 0.08;
    }
    vec0 = pss2[50] - pss2[48];
    vec1 = pss2[51] - pss2[49];
    dist = hypot(vec0, vec1);
    edge2[51] = [pss2[50] + vec1 / dist * width / 2, pss2[51] - vec0 / dist * width / 2];
    edge2[50] = [pss2[50] - vec1 / dist * width / 2, pss2[51] + vec0 / dist * width / 2];

    ctx.beginPath();
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + paw_edge_a + ')';
    curr = edge2[0];
    nex1 = edge2[1];
    nex2 = edge2[2];
    for (let i = 0; i < edge2.length - 2; i++) {
        ctx.moveTo(curr[0], curr[1]);
        ctx.lineTo(nex1[0], nex1[1]);
        ctx.lineTo(nex2[0], nex2[1]);
        ctx.lineTo(curr[0], curr[1]);
        curr = edge2[i + 1];
        nex1 = edge2[i + 2];
        nex2 = edge2[i + 3];
    }
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pss2[50], pss2[51], width / 2 - 1, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + paw_edge_r + ', ' + paw_edge_g + ', ' + paw_edge_b + ', ' + paw_edge_a + ')';
    ctx.fill();
}

module.exports = { drawArm }