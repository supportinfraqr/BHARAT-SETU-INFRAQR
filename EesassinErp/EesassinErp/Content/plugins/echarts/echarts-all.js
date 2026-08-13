! function (e) {
    var t, i;
    ! function () {
        function e(e, t) {
            if (!t) return e;
            if (0 === e.indexOf(".")) {
                var i = t.split("/"),
                    n = e.split("/"),
                    a = i.length - 1,
                    o = n.length,
                    r = 0,
                    s = 0;
                e: for (var l = 0; o > l; l++) switch (n[l]) {
                    case "..":
                        if (!(a > r)) break e;
                        r++, s++;
                        break;
                    case ".":
                        s++;
                        break;
                    default:
                        break e
                }
                return i.length = a - r, n = n.slice(s), i.concat(n).join("/")
            }
            return e
        }

        function n(t) {
            function i(i, r) {
                if ("string" == typeof i) {
                    var s = n[i];
                    return s || (s = o(e(i, t)), n[i] = s), s
                }
                i instanceof Array && (r = r || function () { }, r.apply(this, a(i, r, t)))
            }
            var n = {};
            return i
        }

        function a(i, n, a) {
            for (var s = [], l = r[a], h = 0, m = Math.min(i.length, n.length); m > h; h++) {
                var V, U = e(i[h], a);
                switch (U) {
                    case "require":
                        V = l && l.require || t;
                        break;
                    case "exports":
                        V = l.exports;
                        break;
                    case "module":
                        V = l;
                        break;
                    default:
                        V = o(U)
                }
                s.push(V)
            }
            return s
        }

        function o(e) {
            var t = r[e];
            if (!t) throw new Error("No " + e);
            if (!t.defined) {
                var i = t.factory,
                    n = i.apply(this, a(t.deps || [], i, e));
                "undefined" != typeof n && (t.exports = n), t.defined = 1
            }
            return t.exports
        }
        var r = {};
        i = function (e, t, i) {
            r[e] = {
                id: e,
                deps: t,
                factory: i,
                defined: 0,
                exports: {},
                require: n(e)
            }
        }, t = n("")
    }(), i("echarts", ["echarts/echarts"], function (e) {
        return e
    }), i("echarts/echarts", ["require", "./config", "zrender/tool/util", "zrender/tool/event", "zrender/tool/env", "zrender", "zrender/config", "./chart/island", "./component/toolbox", "./component", "./component/title", "./component/tooltip", "./component/legend", "./util/ecData", "./chart", "zrender/tool/color", "./component/timeline", "zrender/shape/Image", "zrender/loadingEffect/Bar", "zrender/loadingEffect/Bubble", "zrender/loadingEffect/DynamicLine", "zrender/loadingEffect/Ring", "zrender/loadingEffect/Spin", "zrender/loadingEffect/Whirling", "./theme/macarons", "./theme/infographic", "./theme/dark", "./theme/shine", "./theme/helianthus", "./theme/roma", "./theme/green", "./theme/blue", "./theme/macarons2", "./theme/sakura"], function (e) {
        function t() {
            r.Dispatcher.call(this)
        }

        function i(e) {
            e.innerHTML = "", this._themeConfig = {}, this.dom = e, this._connected = !1, this._status = {
                dragIn: !1,
                dragOut: !1,
                needRefresh: !1
            }, this._curEventType = !1, this._chartList = [], this._messageCenter = new t, this._messageCenterOutSide = new t, this.resize = this.resize(), this._init()
        }

        function n(e, t, i, n, a) {
            for (var o = e._chartList, r = o.length; r--;) {
                var s = o[r];
                "function" == typeof s[t] && s[t](i, n, a)
            }
        }
        var a = e("./config"),
            o = e("zrender/tool/util"),
            r = e("zrender/tool/event"),
            s = {},
            l = e("zrender/tool/env").canvasSupported,
            h = new Date - 0,
            m = {},
            V = "_echarts_instance_";
        s.version = "2.2.7", s.dependencies = {
            zrender: "2.1.1"
        }, s.init = function (t, n) {
            var a = e("zrender");
            a.version.replace(".", "") - 0 < s.dependencies.zrender.replace(".", "") - 0 && console.error("ZRender " + a.version + " is too old for ECharts " + s.version + ". Current version need ZRender " + s.dependencies.zrender + "+"), t = t instanceof Array ? t[0] : t;
            var o = t.getAttribute(V);
            return o || (o = h++, t.setAttribute(V, o)), m[o] && m[o].dispose(), m[o] = new i(t), m[o].id = o, m[o].canvasSupported = l, m[o].setTheme(n), m[o]
        }, s.getInstanceById = function (e) {
            return m[e]
        }, o.merge(t.prototype, r.Dispatcher.prototype, !0);
        var U = e("zrender/config").EVENT,
            d = ["CLICK", "DBLCLICK", "MOUSEOVER", "MOUSEOUT", "DRAGSTART", "DRAGEND", "DRAGENTER", "DRAGOVER", "DRAGLEAVE", "DROP"];
        return i.prototype = {
            _init: function () {
                var t = this,
                    i = e("zrender").init(this.dom);
                this._zr = i, this._messageCenter.dispatch = function (e, i, n, a) {
                    n = n || {}, n.type = e, n.event = i, t._messageCenter.dispatchWithContext(e, n, a), t._messageCenterOutSide.dispatchWithContext(e, n, a)
                }, this._onevent = function (e) {
                    return t.__onevent(e)
                };
                for (var n in a.EVENT) "CLICK" != n && "DBLCLICK" != n && "HOVER" != n && "MOUSEOUT" != n && "MAP_ROAM" != n && this._messageCenter.bind(a.EVENT[n], this._onevent, this);
                var o = {};
                this._onzrevent = function (e) {
                    return t[o[e.type]](e)
                };
                for (var r = 0, s = d.length; s > r; r++) {
                    var l = d[r],
                        h = U[l];
                    o[h] = "_on" + l.toLowerCase(), i.on(h, this._onzrevent)
                }
                this.chart = {}, this.component = {};
                var m = e("./chart/island");
                this._island = new m(this._themeConfig, this._messageCenter, i, {}, this), this.chart.island = this._island;
                var V = e("./component/toolbox");
                this._toolbox = new V(this._themeConfig, this._messageCenter, i, {}, this), this.component.toolbox = this._toolbox;
                var p = e("./component");
                p.define("title", e("./component/title")), p.define("tooltip", e("./component/tooltip")), p.define("legend", e("./component/legend")), (0 === i.getWidth() || 0 === i.getHeight()) && console.error("Dom’s width & height should be ready before init.")
            },
            __onevent: function (e) {
                e.__echartsId = e.__echartsId || this.id;
                var t = e.__echartsId === this.id;
                switch (this._curEventType || (this._curEventType = e.type), e.type) {
                    case a.EVENT.LEGEND_SELECTED:
                        this._onlegendSelected(e);
                        break;
                    case a.EVENT.DATA_ZOOM:
                        if (!t) {
                            var i = this.component.dataZoom;
                            i && (i.silence(!0), i.absoluteZoom(e.zoom), i.silence(!1))
                        }
                        this._ondataZoom(e);
                        break;
                    case a.EVENT.DATA_RANGE:
                        t && this._ondataRange(e);
                        break;
                    case a.EVENT.MAGIC_TYPE_CHANGED:
                        if (!t) {
                            var n = this.component.toolbox;
                            n && (n.silence(!0), n.setMagicType(e.magicType), n.silence(!1))
                        }
                        this._onmagicTypeChanged(e);
                        break;
                    case a.EVENT.DATA_VIEW_CHANGED:
                        t && this._ondataViewChanged(e);
                        break;
                    case a.EVENT.TOOLTIP_HOVER:
                        t && this._tooltipHover(e);
                        break;
                    case a.EVENT.RESTORE:
                        this._onrestore();
                        break;
                    case a.EVENT.REFRESH:
                        t && this._onrefresh(e);
                        break;
                    case a.EVENT.TOOLTIP_IN_GRID:
                    case a.EVENT.TOOLTIP_OUT_GRID:
                        if (t) {
                            if (this._connected) {
                                var o = this.component.grid;
                                o && (e.x = (e.event.zrenderX - o.getX()) / o.getWidth(), e.y = (e.event.zrenderY - o.getY()) / o.getHeight())
                            }
                        } else {
                            var o = this.component.grid;
                            o && this._zr.trigger("mousemove", {
                                connectTrigger: !0,
                                zrenderX: o.getX() + e.x * o.getWidth(),
                                zrenderY: o.getY() + e.y * o.getHeight()
                            })
                        }
                }
                if (this._connected && t && this._curEventType === e.type) {
                    for (var r in this._connected) this._connected[r].connectedEventHandler(e);
                    this._curEventType = null
                } (!t || !this._connected && t) && (this._curEventType = null)
            },
            _onclick: function (e) {
                if (n(this, "onclick", e), e.target) {
                    var t = this._eventPackage(e.target);
                    t && null != t.seriesIndex && this._messageCenter.dispatch(a.EVENT.CLICK, e.event, t, this)
                }
            },
            _ondblclick: function (e) {
                if (n(this, "ondblclick", e), e.target) {
                    var t = this._eventPackage(e.target);
                    t && null != t.seriesIndex && this._messageCenter.dispatch(a.EVENT.DBLCLICK, e.event, t, this)
                }
            },
            _onmouseover: function (e) {
                if (e.target) {
                    var t = this._eventPackage(e.target);
                    t && null != t.seriesIndex && this._messageCenter.dispatch(a.EVENT.HOVER, e.event, t, this)
                }
            },
            _onmouseout: function (e) {
                if (e.target) {
                    var t = this._eventPackage(e.target);
                    t && null != t.seriesIndex && this._messageCenter.dispatch(a.EVENT.MOUSEOUT, e.event, t, this)
                }
            },
            _ondragstart: function (e) {
                this._status = {
                    dragIn: !1,
                    dragOut: !1,
                    needRefresh: !1
                }, n(this, "ondragstart", e)
            },
            _ondragenter: function (e) {
                n(this, "ondragenter", e)
            },
            _ondragover: function (e) {
                n(this, "ondragover", e)
            },
            _ondragleave: function (e) {
                n(this, "ondragleave", e)
            },
            _ondrop: function (e) {
                n(this, "ondrop", e, this._status), this._island.ondrop(e, this._status)
            },
            _ondragend: function (e) {
                if (n(this, "ondragend", e, this._status), this._timeline && this._timeline.ondragend(e, this._status), this._island.ondragend(e, this._status), this._status.needRefresh) {
                    this._syncBackupData(this._option);
                    var t = this._messageCenter;
                    t.dispatch(a.EVENT.DATA_CHANGED, e.event, this._eventPackage(e.target), this), t.dispatch(a.EVENT.REFRESH, null, null, this)
                }
            },
            _onlegendSelected: function (e) {
                this._status.needRefresh = !1, n(this, "onlegendSelected", e, this._status), this._status.needRefresh && this._messageCenter.dispatch(a.EVENT.REFRESH, null, null, this)
            },
            _ondataZoom: function (e) {
                this._status.needRefresh = !1, n(this, "ondataZoom", e, this._status), this._status.needRefresh && this._messageCenter.dispatch(a.EVENT.REFRESH, null, null, this)
            },
            _ondataRange: function (e) {
                this._clearEffect(), this._status.needRefresh = !1, n(this, "ondataRange", e, this._status), this._status.needRefresh && this._zr.refreshNextFrame()
            },
            _onmagicTypeChanged: function () {
                this._clearEffect(), this._render(this._toolbox.getMagicOption())
            },
            _ondataViewChanged: function (e) {
                this._syncBackupData(e.option), this._messageCenter.dispatch(a.EVENT.DATA_CHANGED, null, e, this), this._messageCenter.dispatch(a.EVENT.REFRESH, null, null, this)
            },
            _tooltipHover: function (e) {
                var t = [];
                n(this, "ontooltipHover", e, t)
            },
            _onrestore: function () {
                this.restore()
            },
            _onrefresh: function (e) {
                this._refreshInside = !0, this.refresh(e), this._refreshInside = !1
            },
            _syncBackupData: function (e) {
                this.component.dataZoom && this.component.dataZoom.syncBackupData(e)
            },
            _eventPackage: function (t) {
                if (t) {
                    var i = e("./util/ecData"),
                        n = i.get(t, "seriesIndex"),
                        a = i.get(t, "dataIndex");
                    return a = -1 != n && this.component.dataZoom ? this.component.dataZoom.getRealDataIndex(n, a) : a, {
                        seriesIndex: n,
                        seriesName: (i.get(t, "series") || {}).name,
                        dataIndex: a,
                        data: i.get(t, "data"),
                        name: i.get(t, "name"),
                        value: i.get(t, "value"),
                        special: i.get(t, "special")
                    }
                }
            },
            _noDataCheck: function (e) {
                for (var t = e.series, i = 0, n = t.length; n > i; i++)
                    if (t[i].type == a.CHART_TYPE_MAP || t[i].data && t[i].data.length > 0 || t[i].markPoint && t[i].markPoint.data && t[i].markPoint.data.length > 0 || t[i].markLine && t[i].markLine.data && t[i].markLine.data.length > 0 || t[i].nodes && t[i].nodes.length > 0 || t[i].links && t[i].links.length > 0 || t[i].matrix && t[i].matrix.length > 0 || t[i].eventList && t[i].eventList.length > 0) return !1;
                var o = this._option && this._option.noDataLoadingOption || this._themeConfig.noDataLoadingOption || a.noDataLoadingOption || {
                    text: this._option && this._option.noDataText || this._themeConfig.noDataText || a.noDataText,
                    effect: this._option && this._option.noDataEffect || this._themeConfig.noDataEffect || a.noDataEffect
                };
                return this.clear(), this.showLoading(o), !0
            },
            _render: function (t) {
                if (this._mergeGlobalConifg(t), !this._noDataCheck(t)) {
                    var i = t.backgroundColor;
                    if (i)
                        if (l || -1 == i.indexOf("rgba")) this.dom.style.backgroundColor = i;
                        else {
                            var n = i.split(",");
                            this.dom.style.filter = "alpha(opacity=" + 100 * n[3].substring(0, n[3].lastIndexOf(")")) + ")", n.length = 3, n[0] = n[0].replace("a", ""), this.dom.style.backgroundColor = n.join(",") + ")"
                        }
                    this._zr.clearAnimation(), this._chartList = [];
                    var o = e("./chart"),
                        r = e("./component");
                    (t.xAxis || t.yAxis) && (t.grid = t.grid || {}, t.dataZoom = t.dataZoom || {});
                    for (var s, h, m, V = ["title", "legend", "tooltip", "dataRange", "roamController", "grid", "dataZoom", "xAxis", "yAxis", "polar"], U = 0, d = V.length; d > U; U++) h = V[U], m = this.component[h], t[h] ? (m ? m.refresh && m.refresh(t) : (s = r.get(/^[xy]Axis$/.test(h) ? "axis" : h), m = new s(this._themeConfig, this._messageCenter, this._zr, t, this, h), this.component[h] = m), this._chartList.push(m)) : m && (m.dispose(), this.component[h] = null, delete this.component[h]);
                    for (var p, c, u, y = {}, U = 0, d = t.series.length; d > U; U++) c = t.series[U].type, c ? y[c] || (y[c] = !0, p = o.get(c), p ? (this.chart[c] ? (u = this.chart[c], u.refresh(t)) : u = new p(this._themeConfig, this._messageCenter, this._zr, t, this), this._chartList.push(u), this.chart[c] = u) : console.error(c + " has not been required.")) : console.error("series[" + U + "] chart type has not been defined.");
                    for (c in this.chart) c == a.CHART_TYPE_ISLAND || y[c] || (this.chart[c].dispose(), this.chart[c] = null, delete this.chart[c]);
                    this.component.grid && this.component.grid.refixAxisShape(this.component), this._island.refresh(t), this._toolbox.refresh(t), t.animation && !t.renderAsImage ? this._zr.refresh() : this._zr.render();
                    var g = "IMG" + this.id,
                        b = document.getElementById(g);
                    t.renderAsImage && l ? (b ? b.src = this.getDataURL(t.renderAsImage) : (b = this.getImage(t.renderAsImage), b.id = g, b.style.position = "absolute", b.style.left = 0, b.style.top = 0, this.dom.firstChild.appendChild(b)), this.un(), this._zr.un(), this._disposeChartList(), this._zr.clear()) : b && b.parentNode.removeChild(b), b = null, this._option = t
                }
            },
            restore: function () {
                this._clearEffect(), this._option = o.clone(this._optionRestore), this._disposeChartList(), this._island.clear(), this._toolbox.reset(this._option, !0), this._render(this._option)
            },
            refresh: function (e) {
                this._clearEffect(), e = e || {};
                var t = e.option;
                !this._refreshInside && t && (t = this.getOption(), o.merge(t, e.option, !0), o.merge(this._optionRestore, e.option, !0), this._toolbox.reset(t)), this._island.refresh(t), this._toolbox.refresh(t), this._zr.clearAnimation();
                for (var i = 0, n = this._chartList.length; n > i; i++) this._chartList[i].refresh && this._chartList[i].refresh(t);
                this.component.grid && this.component.grid.refixAxisShape(this.component), this._zr.refresh()
            },
            _disposeChartList: function () {
                this._clearEffect(), this._zr.clearAnimation();
                for (var e = this._chartList.length; e--;) {
                    var t = this._chartList[e];
                    if (t) {
                        var i = t.type;
                        this.chart[i] && delete this.chart[i], this.component[i] && delete this.component[i], t.dispose && t.dispose()
                    }
                }
                this._chartList = []
            },
            _mergeGlobalConifg: function (t) {
                for (var i = ["backgroundColor", "calculable", "calculableColor", "calculableHolderColor", "nameConnector", "valueConnector", "animation", "animationThreshold", "animationDuration", "animationDurationUpdate", "animationEasing", "addDataAnimation", "symbolList", "DRAG_ENABLE_TIME"], n = i.length; n--;) {
                    var o = i[n];
                    null == t[o] && (t[o] = null != this._themeConfig[o] ? this._themeConfig[o] : a[o])
                }
                var r = t.color;
                r && r.length || (r = this._themeConfig.color || a.color), this._zr.getColor = function (t) {
                    var i = e("zrender/tool/color");
                    return i.getColor(t, r)
                }, l || (t.animation = !1, t.addDataAnimation = !1)
            },
            setOption: function (e, t) {
                return e.timeline ? this._setTimelineOption(e) : this._setOption(e, t)
            },
            _setOption: function (e, t, i) {
                return !t && this._option ? this._option = o.merge(this.getOption(), o.clone(e), !0) : (this._option = o.clone(e), !i && this._timeline && this._timeline.dispose()), this._optionRestore = o.clone(this._option), this._option.series && 0 !== this._option.series.length ? (this.component.dataZoom && (this._option.dataZoom || this._option.toolbox && this._option.toolbox.feature && this._option.toolbox.feature.dataZoom && this._option.toolbox.feature.dataZoom.show) && this.component.dataZoom.syncOption(this._option), this._toolbox.reset(this._option), this._render(this._option), this) : void this._zr.clear()
            },
            getOption: function () {
                function e(e) {
                    var n = i._optionRestore[e];
                    if (n)
                        if (n instanceof Array)
                            for (var a = n.length; a--;) t[e][a].data = o.clone(n[a].data);
                        else t[e].data = o.clone(n.data)
                }
                var t = o.clone(this._option),
                    i = this;
                return e("xAxis"), e("yAxis"), e("series"), t
            },
            setSeries: function (e, t) {
                return t ? (this._option.series = e, this.setOption(this._option, t)) : this.setOption({
                    series: e
                }), this
            },
            getSeries: function () {
                return this.getOption().series
            },
            _setTimelineOption: function (t) {
                this._timeline && this._timeline.dispose();
                var i = e("./component/timeline"),
                    n = new i(this._themeConfig, this._messageCenter, this._zr, t, this);
                return this._timeline = n, this.component.timeline = this._timeline, this
            },
            addData: function (e, t, i, n, r) {
                function s() {
                    if (V._zr) {
                        V._zr.clearAnimation();
                        for (var e = 0, t = X.length; t > e; e++) X[e].motionlessOnce = h.addDataAnimation && X[e].addDataAnimation;
                        V._messageCenter.dispatch(a.EVENT.REFRESH, null, {
                            option: h
                        }, V)
                    }
                }
                for (var l = e instanceof Array ? e : [
                    [e, t, i, n, r]
                ], h = this.getOption(), m = this._optionRestore, V = this, U = 0, d = l.length; d > U; U++) {
                    e = l[U][0], t = l[U][1], i = l[U][2], n = l[U][3], r = l[U][4];
                    var p = m.series[e],
                        c = i ? "unshift" : "push",
                        u = i ? "pop" : "shift";
                    if (p) {
                        var y = p.data,
                            g = h.series[e].data;
                        if (y[c](t), g[c](t), n || (y[u](), t = g[u]()), null != r) {
                            var b, f;
                            if (p.type === a.CHART_TYPE_PIE && (b = m.legend) && (f = b.data)) {
                                var k = h.legend.data;
                                if (f[c](r), k[c](r), !n) {
                                    var x = o.indexOf(f, t.name); - 1 != x && f.splice(x, 1), x = o.indexOf(k, t.name), -1 != x && k.splice(x, 1)
                                }
                            } else if (null != m.xAxis && null != m.yAxis) {
                                var _, L, W = p.xAxisIndex || 0;
                                (null == m.xAxis[W].type || "category" === m.xAxis[W].type) && (_ = m.xAxis[W].data, L = h.xAxis[W].data, _[c](r), L[c](r), n || (_[u](), L[u]())), W = p.yAxisIndex || 0, "category" === m.yAxis[W].type && (_ = m.yAxis[W].data, L = h.yAxis[W].data, _[c](r), L[c](r), n || (_[u](), L[u]()))
                            }
                        }
                        this._option.series[e].data = h.series[e].data
                    }
                }
                this._zr.clearAnimation();
                for (var X = this._chartList, v = 0, w = function () {
                    v--, 0 === v && s()
                }, U = 0, d = X.length; d > U; U++) h.addDataAnimation && X[U].addDataAnimation && (v++, X[U].addDataAnimation(l, w));
                return this.component.dataZoom && this.component.dataZoom.syncOption(h), this._option = h, h.addDataAnimation || setTimeout(s, 0), this
            },
            addMarkPoint: function (e, t) {
                return this._addMark(e, t, "markPoint")
            },
            addMarkLine: function (e, t) {
                return this._addMark(e, t, "markLine")
            },
            _addMark: function (e, t, i) {
                var n, a = this._option.series;
                if (a && (n = a[e])) {
                    var r = this._optionRestore.series,
                        s = r[e],
                        l = n[i],
                        h = s[i];
                    l = n[i] = l || {
                        data: []
                    }, h = s[i] = h || {
                        data: []
                    };
                    for (var m in t) "data" === m ? (l.data = l.data.concat(t.data), h.data = h.data.concat(t.data)) : "object" != typeof t[m] || null == l[m] ? l[m] = h[m] = t[m] : (o.merge(l[m], t[m], !0), o.merge(h[m], t[m], !0));
                    var V = this.chart[n.type];
                    V && V.addMark(e, t, i)
                }
                return this
            },
            delMarkPoint: function (e, t) {
                return this._delMark(e, t, "markPoint")
            },
            delMarkLine: function (e, t) {
                return this._delMark(e, t, "markLine")
            },
            _delMark: function (e, t, i) {
                var n, a, o, r = this._option.series;
                if (!(r && (n = r[e]) && (a = n[i]) && (o = a.data))) return this;
                t = t.split(" > ");
                for (var s = -1, l = 0, h = o.length; h > l; l++) {
                    var m = o[l];
                    if (m instanceof Array) {
                        if (m[0].name === t[0] && m[1].name === t[1]) {
                            s = l;
                            break
                        }
                    } else if (m.name === t[0]) {
                        s = l;
                        break
                    }
                }
                if (s > -1) {
                    o.splice(s, 1), this._optionRestore.series[e][i].data.splice(s, 1);
                    var V = this.chart[n.type];
                    V && V.delMark(e, t.join(" > "), i)
                }
                return this
            },
            getDom: function () {
                return this.dom
            },
            getZrender: function () {
                return this._zr
            },
            getDataURL: function (e) {
                if (!l) return "";
                if (0 === this._chartList.length) {
                    var t = "IMG" + this.id,
                        i = document.getElementById(t);
                    if (i) return i.src
                }
                var n = this.component.tooltip;
                switch (n && n.hideTip(), e) {
                    case "jpeg":
                        break;
                    default:
                        e = "png"
                }
                var a = this._option.backgroundColor;
                return a && "rgba(0,0,0,0)" === a.replace(" ", "") && (a = "#fff"), this._zr.toDataURL("image/" + e, a)
            },
            getImage: function (e) {
                var t = this._optionRestore.title,
                    i = document.createElement("img");
                return i.src = this.getDataURL(e), i.title = t && t.text || "ECharts", i
            },
            getConnectedDataURL: function (t) {
                if (!this.isConnected()) return this.getDataURL(t);
                var i = this.dom,
                    n = {
                        self: {
                            img: this.getDataURL(t),
                            left: i.offsetLeft,
                            top: i.offsetTop,
                            right: i.offsetLeft + i.offsetWidth,
                            bottom: i.offsetTop + i.offsetHeight
                        }
                    },
                    a = n.self.left,
                    o = n.self.top,
                    r = n.self.right,
                    s = n.self.bottom;
                for (var l in this._connected) i = this._connected[l].getDom(), n[l] = {
                    img: this._connected[l].getDataURL(t),
                    left: i.offsetLeft,
                    top: i.offsetTop,
                    right: i.offsetLeft + i.offsetWidth,
                    bottom: i.offsetTop + i.offsetHeight
                }, a = Math.min(a, n[l].left), o = Math.min(o, n[l].top), r = Math.max(r, n[l].right), s = Math.max(s, n[l].bottom);
                var h = document.createElement("div");
                h.style.position = "absolute", h.style.left = "-4000px", h.style.width = r - a + "px", h.style.height = s - o + "px", document.body.appendChild(h);
                var m = e("zrender").init(h),
                    V = e("zrender/shape/Image");
                for (var l in n) m.addShape(new V({
                    style: {
                        x: n[l].left - a,
                        y: n[l].top - o,
                        image: n[l].img
                    }
                }));
                m.render();
                var U = this._option.backgroundColor;
                U && "rgba(0,0,0,0)" === U.replace(/ /g, "") && (U = "#fff");
                var d = m.toDataURL("image/png", U);
                return setTimeout(function () {
                    m.dispose(), h.parentNode.removeChild(h), h = null
                }, 100), d
            },
            getConnectedImage: function (e) {
                var t = this._optionRestore.title,
                    i = document.createElement("img");
                return i.src = this.getConnectedDataURL(e), i.title = t && t.text || "ECharts", i
            },
            on: function (e, t) {
                return this._messageCenterOutSide.bind(e, t, this), this
            },
            un: function (e, t) {
                return this._messageCenterOutSide.unbind(e, t), this
            },
            connect: function (e) {
                if (!e) return this;
                if (this._connected || (this._connected = {}), e instanceof Array)
                    for (var t = 0, i = e.length; i > t; t++) this._connected[e[t].id] = e[t];
                else this._connected[e.id] = e;
                return this
            },
            disConnect: function (e) {
                if (!e || !this._connected) return this;
                if (e instanceof Array)
                    for (var t = 0, i = e.length; i > t; t++) delete this._connected[e[t].id];
                else delete this._connected[e.id];
                for (var n in this._connected) return this;
                return this._connected = !1, this
            },
            connectedEventHandler: function (e) {
                e.__echartsId != this.id && this._onevent(e)
            },
            isConnected: function () {
                return !!this._connected
            },
            showLoading: function (t) {
                var i = {
                    bar: e("zrender/loadingEffect/Bar"),
                    bubble: e("zrender/loadingEffect/Bubble"),
                    dynamicLine: e("zrender/loadingEffect/DynamicLine"),
                    ring: e("zrender/loadingEffect/Ring"),
                    spin: e("zrender/loadingEffect/Spin"),
                    whirling: e("zrender/loadingEffect/Whirling")
                };
                this._toolbox.hideDataView(), t = t || {};
                var n = t.textStyle || {};
                t.textStyle = n;
                var r = o.merge(o.merge(o.clone(n), this._themeConfig.textStyle), a.textStyle);
                n.textFont = r.fontStyle + " " + r.fontWeight + " " + r.fontSize + "px " + r.fontFamily, n.text = t.text || this._option && this._option.loadingText || this._themeConfig.loadingText || a.loadingText, null != t.x && (n.x = t.x), null != t.y && (n.y = t.y), t.effectOption = t.effectOption || {}, t.effectOption.textStyle = n;
                var s = t.effect;
                return ("string" == typeof s || null == s) && (s = i[t.effect || this._option && this._option.loadingEffect || this._themeConfig.loadingEffect || a.loadingEffect] || i.spin), this._zr.showLoading(new s(t.effectOption)), this
            },
            hideLoading: function () {
                return this._zr.hideLoading(), this
            },
            setTheme: function (t) {
                if (t) {
                    if ("string" == typeof t) switch (t) {
                        case "macarons":
                            t = e("./theme/macarons");
                            break;
                        case "infographic":
                            t = e("./theme/infographic");
                            break;
                        case "dark":
                            t = e("./theme/dark");
                            break;
                        case "shine":
                            t = e("./theme/shine");
                            break;
                        case "helianthus":
                            t = e("./theme/helianthus");
                            break;
                        case "roma":
                            t = e("./theme/roma");
                            break;
                        case "green":
                            t = e("./theme/green");
                            break;
                        case "blue":
                            t = e("./theme/blue");
                            break;
                        case "macarons2":
                            t = e("./theme/macarons2");
                            break;
                        case "sakura":
                            t = e("./theme/sakura");
                            break;
                        default:
                            t = {}
                    } else t = t || {};
                    this._themeConfig = t
                }
                if (!l) {
                    var i = this._themeConfig.textStyle;
                    i && i.fontFamily && i.fontFamily2 && (i.fontFamily = i.fontFamily2), i = a.textStyle, i.fontFamily = i.fontFamily2
                }
                this._timeline && this._timeline.setTheme(!0), this._optionRestore && this.restore()
            },
            resize: function () {
                var e = this;
                return function () {
                    if (e._clearEffect(), e._zr.resize(), e._option && e._option.renderAsImage && l) return e._render(e._option), e;
                    e._zr.clearAnimation(), e._island.resize(), e._toolbox.resize(), e._timeline && e._timeline.resize();
                    for (var t = 0, i = e._chartList.length; i > t; t++) e._chartList[t].resize && e._chartList[t].resize();
                    return e.component.grid && e.component.grid.refixAxisShape(e.component), e._zr.refresh(), e._messageCenter.dispatch(a.EVENT.RESIZE, null, null, e), e
                }
            },
            _clearEffect: function () {
                this._zr.modLayer(a.EFFECT_ZLEVEL, {
                    motionBlur: !1
                }), this._zr.painter.clearLayer(a.EFFECT_ZLEVEL)
            },
            clear: function () {
                return this._disposeChartList(), this._zr.clear(), this._option = {}, this._optionRestore = {}, this.dom.style.backgroundColor = null, this
            },
            dispose: function () {
                var e = this.dom.getAttribute(V);
                e && delete m[e], this._island.dispose(), this._toolbox.dispose(), this._timeline && this._timeline.dispose(), this._messageCenter.unbind(), this.clear(), this._zr.dispose(), this._zr = null
            }
        }, s
    }), i("echarts/config", [], function () {
        var e = {
            CHART_TYPE_LINE: "line",
            CHART_TYPE_BAR: "bar",
            CHART_TYPE_SCATTER: "scatter",
            CHART_TYPE_PIE: "pie",
            CHART_TYPE_RADAR: "radar",
            CHART_TYPE_VENN: "venn",
            CHART_TYPE_TREEMAP: "treemap",
            CHART_TYPE_TREE: "tree",
            CHART_TYPE_MAP: "map",
            CHART_TYPE_K: "k",
            CHART_TYPE_ISLAND: "island",
            CHART_TYPE_FORCE: "force",
            CHART_TYPE_CHORD: "chord",
            CHART_TYPE_GAUGE: "gauge",
            CHART_TYPE_FUNNEL: "funnel",
            CHART_TYPE_EVENTRIVER: "eventRiver",
            CHART_TYPE_WORDCLOUD: "wordCloud",
            CHART_TYPE_HEATMAP: "heatmap",
            COMPONENT_TYPE_TITLE: "title",
            COMPONENT_TYPE_LEGEND: "legend",
            COMPONENT_TYPE_DATARANGE: "dataRange",
            COMPONENT_TYPE_DATAVIEW: "dataView",
            COMPONENT_TYPE_DATAZOOM: "dataZoom",
            COMPONENT_TYPE_TOOLBOX: "toolbox",
            COMPONENT_TYPE_TOOLTIP: "tooltip",
            COMPONENT_TYPE_GRID: "grid",
            COMPONENT_TYPE_AXIS: "axis",
            COMPONENT_TYPE_POLAR: "polar",
            COMPONENT_TYPE_X_AXIS: "xAxis",
            COMPONENT_TYPE_Y_AXIS: "yAxis",
            COMPONENT_TYPE_AXIS_CATEGORY: "categoryAxis",
            COMPONENT_TYPE_AXIS_VALUE: "valueAxis",
            COMPONENT_TYPE_TIMELINE: "timeline",
            COMPONENT_TYPE_ROAMCONTROLLER: "roamController",
            backgroundColor: "rgba(0,0,0,0)",
            color: ["#ff7f50", "#87cefa", "#da70d6", "#32cd32", "#6495ed", "#ff69b4", "#ba55d3", "#cd5c5c", "#ffa500", "#40e0d0", "#1e90ff", "#ff6347", "#7b68ee", "#00fa9a", "#ffd700", "#6699FF", "#ff6666", "#3cb371", "#b8860b", "#30e0e0"],
            markPoint: {
                clickable: !0,
                symbol: "pin",
                symbolSize: 10,
                large: !1,
                effect: {
                    show: !1,
                    loop: !0,
                    period: 15,
                    type: "scale",
                    scaleSize: 2,
                    bounceDistance: 10
                },
                itemStyle: {
                    normal: {
                        borderWidth: 2,
                        label: {
                            show: !0,
                            position: "inside"
                        }
                    },
                    emphasis: {
                        label: {
                            show: !0
                        }
                    }
                }
            },
            markLine: {
                clickable: !0,
                symbol: ["circle", "arrow"],
                symbolSize: [2, 4],
                smoothness: .2,
                precision: 2,
                effect: {
                    show: !1,
                    loop: !0,
                    period: 15,
                    scaleSize: 2
                },
                bundling: {
                    enable: !1,
                    maxTurningAngle: 45
                },
                itemStyle: {
                    normal: {
                        borderWidth: 1.5,
                        label: {
                            show: !0,
                            position: "end"
                        },
                        lineStyle: {
                            type: "dashed"
                        }
                    },
                    emphasis: {
                        label: {
                            show: !1
                        },
                        lineStyle: {}
                    }
                }
            },
            textStyle: {
                decoration: "none",
                fontFamily: "Arial, Verdana, sans-serif",
                fontFamily2: "微软雅黑",
                fontSize: 12,
                fontStyle: "normal",
                fontWeight: "normal"
            },
            EVENT: {
                REFRESH: "refresh",
                RESTORE: "restore",
                RESIZE: "resize",
                CLICK: "click",
                DBLCLICK: "dblclick",
                HOVER: "hover",
                MOUSEOUT: "mouseout",
                DATA_CHANGED: "dataChanged",
                DATA_ZOOM: "dataZoom",
                DATA_RANGE: "dataRange",
                DATA_RANGE_SELECTED: "dataRangeSelected",
                DATA_RANGE_HOVERLINK: "dataRangeHoverLink",
                LEGEND_SELECTED: "legendSelected",
                LEGEND_HOVERLINK: "legendHoverLink",
                MAP_SELECTED: "mapSelected",
                PIE_SELECTED: "pieSelected",
                MAGIC_TYPE_CHANGED: "magicTypeChanged",
                DATA_VIEW_CHANGED: "dataViewChanged",
                TIMELINE_CHANGED: "timelineChanged",
                MAP_ROAM: "mapRoam",
                FORCE_LAYOUT_END: "forceLayoutEnd",
                TOOLTIP_HOVER: "tooltipHover",
                TOOLTIP_IN_GRID: "tooltipInGrid",
                TOOLTIP_OUT_GRID: "tooltipOutGrid",
                ROAMCONTROLLER: "roamController"
            },
            DRAG_ENABLE_TIME: 120,
            EFFECT_ZLEVEL: 10,
            effectBlendAlpha: .95,
            symbolList: ["circle", "rectangle", "triangle", "diamond", "emptyCircle", "emptyRectangle", "emptyTriangle", "emptyDiamond"],
            loadingEffect: "spin",
            loadingText: "数据读取中...",
            noDataEffect: "bubble",
            noDataText: "暂无数据",
            calculable: !1,
            calculableColor: "rgba(255,165,0,0.6)",
            calculableHolderColor: "#ccc",
            nameConnector: " & ",
            valueConnector: ": ",
            animation: !0,
            addDataAnimation: !0,
            animationThreshold: 2e3,
            animationDuration: 2e3,
            animationDurationUpdate: 500,
            animationEasing: "ExponentialOut"
        };
        return e
    }), i("zrender/tool/util", ["require", "../dep/excanvas"], function (e) {
        function t(e) {
            return e && 1 === e.nodeType && "string" == typeof e.nodeName
        }

        function i(e) {
            if ("object" == typeof e && null !== e) {
                var n = e;
                if (e instanceof Array) {
                    n = [];
                    for (var a = 0, o = e.length; o > a; a++) n[a] = i(e[a])
                } else if (!y[g.call(e)] && !t(e)) {
                    n = {};
                    for (var r in e) e.hasOwnProperty(r) && (n[r] = i(e[r]))
                }
                return n
            }
            return e
        }

        function n(e, i, n, o) {
            if (i.hasOwnProperty(n)) {
                var r = e[n];
                "object" != typeof r || y[g.call(r)] || t(r) ? !o && n in e || (e[n] = i[n]) : a(e[n], i[n], o)
            }
        }

        function a(e, t, i) {
            for (var a in t) n(e, t, a, i);
            return e
        }

        function o() {
            if (!U)
                if (e("../dep/excanvas"), window.G_vmlCanvasManager) {
                    var t = document.createElement("div");
                    t.style.position = "absolute", t.style.top = "-1000px", document.body.appendChild(t), U = G_vmlCanvasManager.initElement(t).getContext("2d")
                } else U = document.createElement("canvas").getContext("2d");
            return U
        }

        function r(e, t) {
            if (e.indexOf) return e.indexOf(t);
            for (var i = 0, n = e.length; n > i; i++)
                if (e[i] === t) return i;
            return -1
        }

        function s(e, t) {
            function i() { }
            var n = e.prototype;
            i.prototype = t.prototype, e.prototype = new i;
            for (var a in n) e.prototype[a] = n[a];
            e.constructor = e
        }

        function l(e, t, i) {
            if (e && t)
                if (e.forEach && e.forEach === p) e.forEach(t, i);
                else if (e.length === +e.length)
                    for (var n = 0, a = e.length; a > n; n++) t.call(i, e[n], n, e);
                else
                    for (var o in e) e.hasOwnProperty(o) && t.call(i, e[o], o, e)
        }

        function h(e, t, i) {
            if (e && t) {
                if (e.map && e.map === c) return e.map(t, i);
                for (var n = [], a = 0, o = e.length; o > a; a++) n.push(t.call(i, e[a], a, e));
                return n
            }
        }

        function m(e, t, i) {
            if (e && t) {
                if (e.filter && e.filter === u) return e.filter(t, i);
                for (var n = [], a = 0, o = e.length; o > a; a++) t.call(i, e[a], a, e) && n.push(e[a]);
                return n
            }
        }

        function V(e, t) {
            return function () {
                e.apply(t, arguments)
            }
        }
        var U, d = Array.prototype,
            p = d.forEach,
            c = d.map,
            u = d.filter,
            y = {
                "[object Function]": 1,
                "[object RegExp]": 1,
                "[object Date]": 1,
                "[object Error]": 1,
                "[object CanvasGradient]": 1
            },
            g = Object.prototype.toString;
        return {
            inherits: s,
            clone: i,
            merge: a,
            getContext: o,
            indexOf: r,
            each: l,
            map: h,
            filter: m,
            bind: V
        }
    }), i("zrender/tool/event", ["require", "../mixin/Eventful"], function (e) {
        "use strict";

        function t(e) {
            return "undefined" != typeof e.zrenderX && e.zrenderX || "undefined" != typeof e.offsetX && e.offsetX || "undefined" != typeof e.layerX && e.layerX || "undefined" != typeof e.clientX && e.clientX
        }

        function i(e) {
            return "undefined" != typeof e.zrenderY && e.zrenderY || "undefined" != typeof e.offsetY && e.offsetY || "undefined" != typeof e.layerY && e.layerY || "undefined" != typeof e.clientY && e.clientY
        }

        function n(e) {
            return "undefined" != typeof e.zrenderDelta && e.zrenderDelta || "undefined" != typeof e.wheelDelta && e.wheelDelta || "undefined" != typeof e.detail && -e.detail
        }
        var a = e("../mixin/Eventful"),
            o = "function" == typeof window.addEventListener ? function (e) {
                e.preventDefault(), e.stopPropagation(), e.cancelBubble = !0
            } : function (e) {
                e.returnValue = !1, e.cancelBubble = !0
            };
        return {
            getX: t,
            getY: i,
            getDelta: n,
            stop: o,
            Dispatcher: a
        }
    }), i("zrender/tool/env", [], function () {
        function e(e) {
            var t = this.os = {},
                i = this.browser = {},
                n = e.match(/Web[kK]it[\/]{0,1}([\d.]+)/),
                a = e.match(/(Android);?[\s\/]+([\d.]+)?/),
                o = e.match(/(iPad).*OS\s([\d_]+)/),
                r = e.match(/(iPod)(.*OS\s([\d_]+))?/),
                s = !o && e.match(/(iPhone\sOS)\s([\d_]+)/),
                l = e.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
                h = l && e.match(/TouchPad/),
                m = e.match(/Kindle\/([\d.]+)/),
                V = e.match(/Silk\/([\d._]+)/),
                U = e.match(/(BlackBerry).*Version\/([\d.]+)/),
                d = e.match(/(BB10).*Version\/([\d.]+)/),
                p = e.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
                c = e.match(/PlayBook/),
                u = e.match(/Chrome\/([\d.]+)/) || e.match(/CriOS\/([\d.]+)/),
                y = e.match(/Firefox\/([\d.]+)/),
                g = e.match(/MSIE ([\d.]+)/),
                b = n && e.match(/Mobile\//) && !u,
                f = e.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/) && !u,
                g = e.match(/MSIE\s([\d.]+)/);
            return (i.webkit = !!n) && (i.version = n[1]), a && (t.android = !0, t.version = a[2]), s && !r && (t.ios = t.iphone = !0, t.version = s[2].replace(/_/g, ".")), o && (t.ios = t.ipad = !0, t.version = o[2].replace(/_/g, ".")), r && (t.ios = t.ipod = !0, t.version = r[3] ? r[3].replace(/_/g, ".") : null), l && (t.webos = !0, t.version = l[2]), h && (t.touchpad = !0), U && (t.blackberry = !0, t.version = U[2]), d && (t.bb10 = !0, t.version = d[2]), p && (t.rimtabletos = !0, t.version = p[2]), c && (i.playbook = !0), m && (t.kindle = !0, t.version = m[1]), V && (i.silk = !0, i.version = V[1]), !V && t.android && e.match(/Kindle Fire/) && (i.silk = !0), u && (i.chrome = !0, i.version = u[1]), y && (i.firefox = !0, i.version = y[1]), g && (i.ie = !0, i.version = g[1]), b && (e.match(/Safari/) || t.ios) && (i.safari = !0), f && (i.webview = !0), g && (i.ie = !0, i.version = g[1]), t.tablet = !!(o || c || a && !e.match(/Mobile/) || y && e.match(/Tablet/) || g && !e.match(/Phone/) && e.match(/Touch/)), t.phone = !(t.tablet || t.ipod || !(a || s || l || U || d || u && e.match(/Android/) || u && e.match(/CriOS\/([\d.]+)/) || y && e.match(/Mobile/) || g && e.match(/Touch/))), {
                browser: i,
                os: t,
                canvasSupported: document.createElement("canvas").getContext ? !0 : !1
            }
        }
        return e(navigator.userAgent)
    }), i("zrender", ["zrender/zrender"], function (e) {
        return e
    }), i("zrender/zrender", ["require", "./dep/excanvas", "./tool/util", "./tool/log", "./tool/guid", "./Handler", "./Painter", "./Storage", "./animation/Animation", "./tool/env"], function (e) {
        function t(e) {
            return function () {
                e._needsRefreshNextFrame && e.refresh()
            }
        }
        e("./dep/excanvas");
        var i = e("./tool/util"),
            n = e("./tool/log"),
            a = e("./tool/guid"),
            o = e("./Handler"),
            r = e("./Painter"),
            s = e("./Storage"),
            l = e("./animation/Animation"),
            h = {},
            m = {};
        m.version = "2.1.1", m.init = function (e) {
            var t = new V(a(), e);
            return h[t.id] = t, t
        }, m.dispose = function (e) {
            if (e) e.dispose();
            else {
                for (var t in h) h[t].dispose();
                h = {}
            }
            return m
        }, m.getInstance = function (e) {
            return h[e]
        }, m.delInstance = function (e) {
            return delete h[e], m
        };
        var V = function (i, n) {
            this.id = i, this.env = e("./tool/env"), this.storage = new s, this.painter = new r(n, this.storage), this.handler = new o(n, this.storage, this.painter), this.animation = new l({
                stage: {
                    update: t(this)
                }
            }), this.animation.start();
            var a = this;
            this.painter.refreshNextFrame = function () {
                a.refreshNextFrame()
            }, this._needsRefreshNextFrame = !1;
            var a = this,
                h = this.storage,
                m = h.delFromMap;
            h.delFromMap = function (e) {
                var t = h.get(e);
                a.stopAnimation(t), m.call(h, e)
            }
        };
        return V.prototype.getId = function () {
            return this.id
        }, V.prototype.addShape = function (e) {
            return this.addElement(e), this
        }, V.prototype.addGroup = function (e) {
            return this.addElement(e), this
        }, V.prototype.delShape = function (e) {
            return this.delElement(e), this
        }, V.prototype.delGroup = function (e) {
            return this.delElement(e), this
        }, V.prototype.modShape = function (e, t) {
            return this.modElement(e, t), this
        }, V.prototype.modGroup = function (e, t) {
            return this.modElement(e, t), this
        }, V.prototype.addElement = function (e) {
            return this.storage.addRoot(e), this._needsRefreshNextFrame = !0, this
        }, V.prototype.delElement = function (e) {
            return this.storage.delRoot(e), this._needsRefreshNextFrame = !0, this
        }, V.prototype.modElement = function (e, t) {
            return this.storage.mod(e, t), this._needsRefreshNextFrame = !0, this
        }, V.prototype.modLayer = function (e, t) {
            return this.painter.modLayer(e, t), this._needsRefreshNextFrame = !0, this
        }, V.prototype.addHoverShape = function (e) {
            return this.storage.addHover(e), this
        }, V.prototype.render = function (e) {
            return this.painter.render(e), this._needsRefreshNextFrame = !1, this
        }, V.prototype.refresh = function (e) {
            return this.painter.refresh(e), this._needsRefreshNextFrame = !1, this
        }, V.prototype.refreshNextFrame = function () {
            return this._needsRefreshNextFrame = !0, this
        }, V.prototype.refreshHover = function (e) {
            return this.painter.refreshHover(e), this
        }, V.prototype.refreshShapes = function (e, t) {
            return this.painter.refreshShapes(e, t), this
        }, V.prototype.resize = function () {
            return this.painter.resize(), this
        }, V.prototype.animate = function (e, t, a) {
            var o = this;
            if ("string" == typeof e && (e = this.storage.get(e)), e) {
                var r;
                if (t) {
                    for (var s = t.split("."), l = e, h = 0, m = s.length; m > h; h++) l && (l = l[s[h]]);
                    l && (r = l)
                } else r = e;
                if (!r) return void n('Property "' + t + '" is not existed in element ' + e.id);

                null == e.__animators && (e.__animators = []);
                var V = e.__animators,
                    U = this.animation.animate(r, {
                        loop: a
                    }).during(function () {
                        o.modShape(e)
                    }).done(function () {
                        var t = i.indexOf(e.__animators, U);
                        t >= 0 && V.splice(t, 1)
                    });
                return V.push(U), U
            }
            n("Element not existed")
        }, V.prototype.stopAnimation = function (e) {
            if (e.__animators) {
                for (var t = e.__animators, i = t.length, n = 0; i > n; n++) t[n].stop();
                t.length = 0
            }
            return this
        }, V.prototype.clearAnimation = function () {
            return this.animation.clear(), this
        }, V.prototype.showLoading = function (e) {
            return this.painter.showLoading(e), this
        }, V.prototype.hideLoading = function () {
            return this.painter.hideLoading(), this
        }, V.prototype.getWidth = function () {
            return this.painter.getWidth()
        }, V.prototype.getHeight = function () {
            return this.painter.getHeight()
        }, V.prototype.toDataURL = function (e, t, i) {
            return this.painter.toDataURL(e, t, i)
        }, V.prototype.shapeToImage = function (e, t, i) {
            var n = a();
            return this.painter.shapeToImage(n, e, t, i)
        }, V.prototype.on = function (e, t, i) {
            return this.handler.on(e, t, i), this
        }, V.prototype.un = function (e, t) {
            return this.handler.un(e, t), this
        }, V.prototype.trigger = function (e, t) {
            return this.handler.trigger(e, t), this
        }, V.prototype.clear = function () {
            return this.storage.delRoot(), this.painter.clear(), this
        }, V.prototype.dispose = function () {
            this.animation.stop(), this.clear(), this.storage.dispose(), this.painter.dispose(), this.handler.dispose(), this.animation = this.storage = this.painter = this.handler = null, m.delInstance(this.id)
        }, m
    }), i("zrender/config", [], function () {
        var e = {
            EVENT: {
                RESIZE: "resize",
                CLICK: "click",
                DBLCLICK: "dblclick",
                MOUSEWHEEL: "mousewheel",
                MOUSEMOVE: "mousemove",
                MOUSEOVER: "mouseover",
                MOUSEOUT: "mouseout",
                MOUSEDOWN: "mousedown",
                MOUSEUP: "mouseup",
                GLOBALOUT: "globalout",
                DRAGSTART: "dragstart",
                DRAGEND: "dragend",
                DRAGENTER: "dragenter",
                DRAGOVER: "dragover",
                DRAGLEAVE: "dragleave",
                DROP: "drop",
                touchClickDelay: 300
            },
            elementClassName: "zr-element",
            catchBrushException: !1,
            debugMode: 0,
            devicePixelRatio: Math.max(window.devicePixelRatio || 1, 1)
        };
        return e
    }), i("echarts/chart/island", ["require", "./base", "zrender/shape/Circle", "../config", "../util/ecData", "zrender/tool/util", "zrender/tool/event", "zrender/tool/color", "../util/accMath", "../chart"], function (e) {
        function t(e, t, n, a, r) {
            i.call(this, e, t, n, a, r), this._nameConnector, this._valueConnector, this._zrHeight = this.zr.getHeight(), this._zrWidth = this.zr.getWidth();
            var l = this;
            l.shapeHandler.onmousewheel = function (e) {
                var t = e.target,
                    i = e.event,
                    n = s.getDelta(i);
                n = n > 0 ? -1 : 1, t.style.r -= n, t.style.r = t.style.r < 5 ? 5 : t.style.r;
                var a = o.get(t, "value"),
                    r = a * l.option.island.calculateStep;
                a = r > 1 ? Math.round(a - r * n) : +(a - r * n).toFixed(2);
                var h = o.get(t, "name");
                t.style.text = h + ":" + a, o.set(t, "value", a), o.set(t, "name", h), l.zr.modShape(t.id), l.zr.refreshNextFrame(), s.stop(i)
            }
        }
        var i = e("./base"),
            n = e("zrender/shape/Circle"),
            a = e("../config");
        a.island = {
            zlevel: 0,
            z: 5,
            r: 15,
            calculateStep: .1
        };
        var o = e("../util/ecData"),
            r = e("zrender/tool/util"),
            s = e("zrender/tool/event");
        return t.prototype = {
            type: a.CHART_TYPE_ISLAND,
            _combine: function (t, i) {
                var n = e("zrender/tool/color"),
                    a = e("../util/accMath"),
                    r = a.accAdd(o.get(t, "value"), o.get(i, "value")),
                    s = o.get(t, "name") + this._nameConnector + o.get(i, "name");
                t.style.text = s + this._valueConnector + r, o.set(t, "value", r), o.set(t, "name", s), t.style.r = this.option.island.r, t.style.color = n.mix(t.style.color, i.style.color)
            },
            refresh: function (e) {
                e && (e.island = this.reformOption(e.island), this.option = e, this._nameConnector = this.option.nameConnector, this._valueConnector = this.option.valueConnector)
            },
            getOption: function () {
                return this.option
            },
            resize: function () {
                var e = this.zr.getWidth(),
                    t = this.zr.getHeight(),
                    i = e / (this._zrWidth || e),
                    n = t / (this._zrHeight || t);
                if (1 !== i || 1 !== n) {
                    this._zrWidth = e, this._zrHeight = t;
                    for (var a = 0, o = this.shapeList.length; o > a; a++) this.zr.modShape(this.shapeList[a].id, {
                        style: {
                            x: Math.round(this.shapeList[a].style.x * i),
                            y: Math.round(this.shapeList[a].style.y * n)
                        }
                    })
                }
            },
            add: function (e) {
                var t = o.get(e, "name"),
                    i = o.get(e, "value"),
                    a = null != o.get(e, "series") ? o.get(e, "series").name : "",
                    r = this.getFont(this.option.island.textStyle),
                    s = this.option.island,
                    l = {
                        zlevel: s.zlevel,
                        z: s.z,
                        style: {
                            x: e.style.x,
                            y: e.style.y,
                            r: this.option.island.r,
                            color: e.style.color || e.style.strokeColor,
                            text: t + this._valueConnector + i,
                            textFont: r
                        },
                        draggable: !0,
                        hoverable: !0,
                        onmousewheel: this.shapeHandler.onmousewheel,
                        _type: "island"
                    };
                "#fff" === l.style.color && (l.style.color = e.style.strokeColor), this.setCalculable(l), l.dragEnableTime = 0, o.pack(l, {
                    name: a
                }, -1, i, -1, t), l = new n(l), this.shapeList.push(l), this.zr.addShape(l)
            },
            del: function (e) {
                this.zr.delShape(e.id);
                for (var t = [], i = 0, n = this.shapeList.length; n > i; i++) this.shapeList[i].id != e.id && t.push(this.shapeList[i]);
                this.shapeList = t
            },
            ondrop: function (e, t) {
                if (this.isDrop && e.target) {
                    var i = e.target,
                        n = e.dragged;
                    this._combine(i, n), this.zr.modShape(i.id), t.dragIn = !0, this.isDrop = !1
                }
            },
            ondragend: function (e, t) {
                var i = e.target;
                this.isDragend ? t.dragIn && (this.del(i), t.needRefresh = !0) : t.dragIn || (i.style.x = s.getX(e.event), i.style.y = s.getY(e.event), this.add(i), t.needRefresh = !0), this.isDragend = !1
            }
        }, r.inherits(t, i), e("../chart").define("island", t), t
    }), i("echarts/component/toolbox", ["require", "./base", "zrender/shape/Line", "zrender/shape/Image", "zrender/shape/Rectangle", "../util/shape/Icon", "../config", "zrender/tool/util", "zrender/config", "zrender/tool/event", "./dataView", "../component"], function (e) {
        function t(e, t, n, a, o) {
            i.call(this, e, t, n, a, o), this.dom = o.dom, this._magicType = {}, this._magicMap = {}, this._isSilence = !1, this._iconList, this._iconShapeMap = {}, this._featureTitle = {}, this._featureIcon = {}, this._featureColor = {}, this._featureOption = {}, this._enableColor = "red", this._disableColor = "#ccc", this._markShapeList = [];
            var r = this;
            r._onMark = function (e) {
                r.__onMark(e)
            }, r._onMarkUndo = function (e) {
                r.__onMarkUndo(e)
            }, r._onMarkClear = function (e) {
                r.__onMarkClear(e)
            }, r._onDataZoom = function (e) {
                r.__onDataZoom(e)
            }, r._onDataZoomReset = function (e) {
                r.__onDataZoomReset(e)
            }, r._onDataView = function (e) {
                r.__onDataView(e)
            }, r._onRestore = function (e) {
                r.__onRestore(e)
            }, r._onSaveAsImage = function (e) {
                r.__onSaveAsImage(e)
            }, r._onMagicType = function (e) {
                r.__onMagicType(e)
            }, r._onCustomHandler = function (e) {
                r.__onCustomHandler(e)
            }, r._onmousemove = function (e) {
                return r.__onmousemove(e)
            }, r._onmousedown = function (e) {
                return r.__onmousedown(e)
            }, r._onmouseup = function (e) {
                return r.__onmouseup(e)
            }, r._onclick = function (e) {
                return r.__onclick(e)
            }
        }
        var i = e("./base"),
            n = e("zrender/shape/Line"),
            a = e("zrender/shape/Image"),
            o = e("zrender/shape/Rectangle"),
            r = e("../util/shape/Icon"),
            s = e("../config");
        s.toolbox = {
            zlevel: 0,
            z: 6,
            show: !1,
            orient: "horizontal",
            x: "right",
            y: "top",
            color: ["#1e90ff", "#22bb22", "#4b0082", "#d2691e"],
            disableColor: "#ddd",
            effectiveColor: "red",
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "#ccc",
            borderWidth: 0,
            padding: 5,
            itemGap: 10,
            itemSize: 16,
            showTitle: !0,
            feature: {
                mark: {
                    show: !1,
                    title: {
                        mark: "Guide Lines",
                        markUndo: "Remove Guides",
                        markClear: "Clear Guides"
                    },
                    lineStyle: {
                        width: 1,
                        color: "#1e90ff",
                        type: "dashed"
                    }
                },
                dataZoom: {
                    show: !1,
                    title: {
                        dataZoom: "Data Zoom",
                        dataZoomReset: "Data Zoom Reset"
                    }
                },
                dataView: {
                    show: !1,
                    title: "Data View",
                    readOnly: !1,
                    lang: ["Data View", "Close", "Refresh"]
                },
                magicType: {
                    show: !1,
                    title: {
                        line: "Switch to Line Chart",
                        bar: "Switch to Bar Chart",
                        stack: "Stack",
                        tiled: "Tile",
                        force: "Switch to Force-Directed Layout",
                        chord: "Switch to Chord",
                        pie: "Switch to Pie Chart",
                        funnel: "Switch to Funnel"
                    },
                    type: []
                },
                restore: {
                    show: !1,
                    title: "Reload"
                },
                saveAsImage: {
                    show: !1,
                    title: "Save as Image",
                    type: "png",
                    lang: ["Click to Save"]
                }
            }
        };
        var l = e("zrender/tool/util"),
            h = e("zrender/config"),
            m = e("zrender/tool/event"),
            V = "stack",
            U = "tiled";
        return t.prototype = {
            type: s.COMPONENT_TYPE_TOOLBOX,
            _buildShape: function () {
                this._iconList = [];
                var e = this.option.toolbox;
                this._enableColor = e.effectiveColor, this._disableColor = e.disableColor;
                var t = e.feature,
                    i = [];
                for (var n in t)
                    if (t[n].show) switch (n) {
                        case "mark":
                            i.push({
                                key: n,
                                name: "mark"
                            }), i.push({
                                key: n,
                                name: "markUndo"
                            }), i.push({
                                key: n,
                                name: "markClear"
                            });
                            break;
                        case "magicType":
                            for (var a = 0, o = t[n].type.length; o > a; a++) t[n].title[t[n].type[a] + "Chart"] = t[n].title[t[n].type[a]], t[n].option && (t[n].option[t[n].type[a] + "Chart"] = t[n].option[t[n].type[a]]), i.push({
                                key: n,
                                name: t[n].type[a] + "Chart"
                            });
                            break;
                        case "dataZoom":
                            i.push({
                                key: n,
                                name: "dataZoom"
                            }), i.push({
                                key: n,
                                name: "dataZoomReset"
                            });
                            break;
                        case "saveAsImage":
                            this.canvasSupported && i.push({
                                key: n,
                                name: "saveAsImage"
                            });
                            break;
                        default:
                            i.push({
                                key: n,
                                name: n
                            })
                    }
                if (i.length > 0) {
                    for (var r, n, a = 0, o = i.length; o > a; a++) r = i[a].name, n = i[a].key, this._iconList.push(r), this._featureTitle[r] = t[n].title[r] || t[n].title, t[n].icon && (this._featureIcon[r] = t[n].icon[r] || t[n].icon), t[n].color && (this._featureColor[r] = t[n].color[r] || t[n].color), t[n].option && (this._featureOption[r] = t[n].option[r] || t[n].option);
                    this._itemGroupLocation = this._getItemGroupLocation(), this._buildBackground(), this._buildItem();
                    for (var a = 0, o = this.shapeList.length; o > a; a++) this.zr.addShape(this.shapeList[a]);
                    this._iconShapeMap.mark && (this._iconDisable(this._iconShapeMap.markUndo), this._iconDisable(this._iconShapeMap.markClear)), this._iconShapeMap.dataZoomReset && 0 === this._zoomQueue.length && this._iconDisable(this._iconShapeMap.dataZoomReset)
                }
            },
            _buildItem: function () {
                var t, i, n, o, s = this.option.toolbox,
                    l = this._iconList.length,
                    h = this._itemGroupLocation.x,
                    m = this._itemGroupLocation.y,
                    V = s.itemSize,
                    U = s.itemGap,
                    d = s.color instanceof Array ? s.color : [s.color],
                    p = this.getFont(s.textStyle);
                "horizontal" === s.orient ? (i = this._itemGroupLocation.y / this.zr.getHeight() < .5 ? "bottom" : "top", n = this._itemGroupLocation.x / this.zr.getWidth() < .5 ? "left" : "right", o = this._itemGroupLocation.y / this.zr.getHeight() < .5 ? "top" : "bottom") : i = this._itemGroupLocation.x / this.zr.getWidth() < .5 ? "right" : "left", this._iconShapeMap = {};
                for (var c = this, u = 0; l > u; u++) {
                    switch (t = {
                        type: "icon",
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            x: h,
                            y: m,
                            width: V,
                            height: V,
                            iconType: this._iconList[u],
                            lineWidth: 1,
                            strokeColor: this._featureColor[this._iconList[u]] || d[u % d.length],
                            brushType: "stroke"
                        },
                        highlightStyle: {
                            lineWidth: 1,
                            text: s.showTitle ? this._featureTitle[this._iconList[u]] : void 0,
                            textFont: p,
                            textPosition: i,
                            strokeColor: this._featureColor[this._iconList[u]] || d[u % d.length]
                        },
                        hoverable: !0,
                        clickable: !0
                    }, this._featureIcon[this._iconList[u]] && (t.style.image = this._featureIcon[this._iconList[u]].replace(new RegExp("^image:\\/\\/"), ""), t.style.opacity = .8, t.highlightStyle.opacity = 1, t.type = "image"), "horizontal" === s.orient && (0 === u && "left" === n && (t.highlightStyle.textPosition = "specific", t.highlightStyle.textAlign = n, t.highlightStyle.textBaseline = o, t.highlightStyle.textX = h, t.highlightStyle.textY = "top" === o ? m + V + 10 : m - 10), u === l - 1 && "right" === n && (t.highlightStyle.textPosition = "specific", t.highlightStyle.textAlign = n, t.highlightStyle.textBaseline = o, t.highlightStyle.textX = h + V, t.highlightStyle.textY = "top" === o ? m + V + 10 : m - 10)), this._iconList[u]) {
                        case "mark":
                            t.onclick = c._onMark;
                            break;
                        case "markUndo":
                            t.onclick = c._onMarkUndo;
                            break;
                        case "markClear":
                            t.onclick = c._onMarkClear;
                            break;
                        case "dataZoom":
                            t.onclick = c._onDataZoom;
                            break;
                        case "dataZoomReset":
                            t.onclick = c._onDataZoomReset;
                            break;
                        case "dataView":
                            if (!this._dataView) {
                                var y = e("./dataView");
                                this._dataView = new y(this.ecTheme, this.messageCenter, this.zr, this.option, this.myChart)
                            }
                            t.onclick = c._onDataView;
                            break;
                        case "restore":
                            t.onclick = c._onRestore;
                            break;
                        case "saveAsImage":
                            t.onclick = c._onSaveAsImage;
                            break;
                        default:
                            this._iconList[u].match("Chart") ? (t._name = this._iconList[u].replace("Chart", ""), t.onclick = c._onMagicType) : t.onclick = c._onCustomHandler
                    }
                    "icon" === t.type ? t = new r(t) : "image" === t.type && (t = new a(t)), this.shapeList.push(t), this._iconShapeMap[this._iconList[u]] = t, "horizontal" === s.orient ? h += V + U : m += V + U
                }
            },
            _buildBackground: function () {
                var e = this.option.toolbox,
                    t = this.reformCssArray(this.option.toolbox.padding);
                this.shapeList.push(new o({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable: !1,
                    style: {
                        x: this._itemGroupLocation.x - t[3],
                        y: this._itemGroupLocation.y - t[0],
                        width: this._itemGroupLocation.width + t[3] + t[1],
                        height: this._itemGroupLocation.height + t[0] + t[2],
                        brushType: 0 === e.borderWidth ? "fill" : "both",
                        color: e.backgroundColor,
                        strokeColor: e.borderColor,
                        lineWidth: e.borderWidth
                    }
                }))
            },
            _getItemGroupLocation: function () {
                var e = this.option.toolbox,
                    t = this.reformCssArray(this.option.toolbox.padding),
                    i = this._iconList.length,
                    n = e.itemGap,
                    a = e.itemSize,
                    o = 0,
                    r = 0;
                "horizontal" === e.orient ? (o = (a + n) * i - n, r = a) : (r = (a + n) * i - n, o = a);
                var s, l = this.zr.getWidth();
                switch (e.x) {
                    case "center":
                        s = Math.floor((l - o) / 2);
                        break;
                    case "left":
                        s = t[3] + e.borderWidth;
                        break;
                    case "right":
                        s = l - o - t[1] - e.borderWidth;
                        break;
                    default:
                        s = e.x - 0, s = isNaN(s) ? 0 : s
                }
                var h, m = this.zr.getHeight();
                switch (e.y) {
                    case "top":
                        h = t[0] + e.borderWidth;
                        break;
                    case "bottom":
                        h = m - r - t[2] - e.borderWidth;
                        break;
                    case "center":
                        h = Math.floor((m - r) / 2);
                        break;
                    default:
                        h = e.y - 0, h = isNaN(h) ? 0 : h
                }
                return {
                    x: s,
                    y: h,
                    width: o,
                    height: r
                }
            },
            __onmousemove: function (e) {
                this._marking && (this._markShape.style.xEnd = m.getX(e.event), this._markShape.style.yEnd = m.getY(e.event), this.zr.addHoverShape(this._markShape)), this._zooming && (this._zoomShape.style.width = m.getX(e.event) - this._zoomShape.style.x, this._zoomShape.style.height = m.getY(e.event) - this._zoomShape.style.y, this.zr.addHoverShape(this._zoomShape), this.dom.style.cursor = "crosshair", m.stop(e.event)), this._zoomStart && "pointer" != this.dom.style.cursor && "move" != this.dom.style.cursor && (this.dom.style.cursor = "crosshair")
            },
            __onmousedown: function (e) {
                if (!e.target) {
                    this._zooming = !0;
                    var t = m.getX(e.event),
                        i = m.getY(e.event),
                        n = this.option.dataZoom || {};
                    return this._zoomShape = new o({
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            x: t,
                            y: i,
                            width: 1,
                            height: 1,
                            brushType: "both"
                        },
                        highlightStyle: {
                            lineWidth: 2,
                            color: n.fillerColor || s.dataZoom.fillerColor,
                            strokeColor: n.handleColor || s.dataZoom.handleColor,
                            brushType: "both"
                        }
                    }), this.zr.addHoverShape(this._zoomShape), !0
                }
            },
            __onmouseup: function () {
                if (!this._zoomShape || Math.abs(this._zoomShape.style.width) < 10 || Math.abs(this._zoomShape.style.height) < 10) return this._zooming = !1, !0;
                if (this._zooming && this.component.dataZoom) {
                    this._zooming = !1;
                    var e = this.component.dataZoom.rectZoom(this._zoomShape.style);
                    e && (this._zoomQueue.push({
                        start: e.start,
                        end: e.end,
                        start2: e.start2,
                        end2: e.end2
                    }), this._iconEnable(this._iconShapeMap.dataZoomReset), this.zr.refreshNextFrame())
                }
                return !0
            },
            __onclick: function (e) {
                if (!e.target)
                    if (this._marking) this._marking = !1, this._markShapeList.push(this._markShape), this._iconEnable(this._iconShapeMap.markUndo), this._iconEnable(this._iconShapeMap.markClear), this.zr.addShape(this._markShape), this.zr.refreshNextFrame();
                    else if (this._markStart) {
                        this._marking = !0;
                        var t = m.getX(e.event),
                            i = m.getY(e.event);
                        this._markShape = new n({
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase(),
                            style: {
                                xStart: t,
                                yStart: i,
                                xEnd: t,
                                yEnd: i,
                                lineWidth: this.query(this.option, "toolbox.feature.mark.lineStyle.width"),
                                strokeColor: this.query(this.option, "toolbox.feature.mark.lineStyle.color"),
                                lineType: this.query(this.option, "toolbox.feature.mark.lineStyle.type")
                            }
                        }), this.zr.addHoverShape(this._markShape)
                    }
            },
            __onMark: function (e) {
                var t = e.target;
                if (this._marking || this._markStart) this._resetMark(), this.zr.refreshNextFrame();
                else {
                    this._resetZoom(), this.zr.modShape(t.id, {
                        style: {
                            strokeColor: this._enableColor
                        }
                    }), this.zr.refreshNextFrame(), this._markStart = !0;
                    var i = this;
                    setTimeout(function () {
                        i.zr && i.zr.on(h.EVENT.CLICK, i._onclick) && i.zr.on(h.EVENT.MOUSEMOVE, i._onmousemove)
                    }, 10)
                }
                return !0
            },
            __onMarkUndo: function () {
                if (this._marking) this._marking = !1;
                else {
                    var e = this._markShapeList.length;
                    if (e >= 1) {
                        var t = this._markShapeList[e - 1];
                        this.zr.delShape(t.id), this.zr.refreshNextFrame(), this._markShapeList.pop(), 1 === e && (this._iconDisable(this._iconShapeMap.markUndo), this._iconDisable(this._iconShapeMap.markClear))
                    }
                }
                return !0
            },
            __onMarkClear: function () {
                this._marking && (this._marking = !1);
                var e = this._markShapeList.length;
                if (e > 0) {
                    for (; e--;) this.zr.delShape(this._markShapeList.pop().id);
                    this._iconDisable(this._iconShapeMap.markUndo), this._iconDisable(this._iconShapeMap.markClear), this.zr.refreshNextFrame()
                }
                return !0
            },
            __onDataZoom: function (e) {
                var t = e.target;
                if (this._zooming || this._zoomStart) this._resetZoom(), this.zr.refreshNextFrame(), this.dom.style.cursor = "default";
                else {
                    this._resetMark(), this.zr.modShape(t.id, {
                        style: {
                            strokeColor: this._enableColor
                        }
                    }), this.zr.refreshNextFrame(), this._zoomStart = !0;
                    var i = this;
                    setTimeout(function () {
                        i.zr && i.zr.on(h.EVENT.MOUSEDOWN, i._onmousedown) && i.zr.on(h.EVENT.MOUSEUP, i._onmouseup) && i.zr.on(h.EVENT.MOUSEMOVE, i._onmousemove)
                    }, 10), this.dom.style.cursor = "crosshair"
                }
                return !0
            },
            __onDataZoomReset: function () {
                return this._zooming && (this._zooming = !1), this._zoomQueue.pop(), this._zoomQueue.length > 0 ? this.component.dataZoom.absoluteZoom(this._zoomQueue[this._zoomQueue.length - 1]) : (this.component.dataZoom.rectZoom(), this._iconDisable(this._iconShapeMap.dataZoomReset), this.zr.refreshNextFrame()), !0
            },
            _resetMark: function () {
                this._marking = !1, this._markStart && (this._markStart = !1, this._iconShapeMap.mark && this.zr.modShape(this._iconShapeMap.mark.id, {
                    style: {
                        strokeColor: this._iconShapeMap.mark.highlightStyle.strokeColor
                    }
                }), this.zr.un(h.EVENT.CLICK, this._onclick), this.zr.un(h.EVENT.MOUSEMOVE, this._onmousemove))
            },
            _resetZoom: function () {
                this._zooming = !1, this._zoomStart && (this._zoomStart = !1, this._iconShapeMap.dataZoom && this.zr.modShape(this._iconShapeMap.dataZoom.id, {
                    style: {
                        strokeColor: this._iconShapeMap.dataZoom.highlightStyle.strokeColor
                    }
                }), this.zr.un(h.EVENT.MOUSEDOWN, this._onmousedown), this.zr.un(h.EVENT.MOUSEUP, this._onmouseup), this.zr.un(h.EVENT.MOUSEMOVE, this._onmousemove))
            },
            _iconDisable: function (e) {
                "image" != e.type ? this.zr.modShape(e.id, {
                    hoverable: !1,
                    clickable: !1,
                    style: {
                        strokeColor: this._disableColor
                    }
                }) : this.zr.modShape(e.id, {
                    hoverable: !1,
                    clickable: !1,
                    style: {
                        opacity: .3
                    }
                })
            },
            _iconEnable: function (e) {
                "image" != e.type ? this.zr.modShape(e.id, {
                    hoverable: !0,
                    clickable: !0,
                    style: {
                        strokeColor: e.highlightStyle.strokeColor
                    }
                }) : this.zr.modShape(e.id, {
                    hoverable: !0,
                    clickable: !0,
                    style: {
                        opacity: .8
                    }
                })
            },
            __onDataView: function () {
                return this._dataView.show(this.option), !0
            },
            __onRestore: function () {
                return this._resetMark(), this._resetZoom(), this.messageCenter.dispatch(s.EVENT.RESTORE, null, null, this.myChart), !0
            },
            __onSaveAsImage: function () {
                var e = this.option.toolbox.feature.saveAsImage,
                    t = e.type || "png";
                "png" != t && "jpeg" != t && (t = "png");
                var i;
                i = this.myChart.isConnected() ? this.myChart.getConnectedDataURL(t) : this.zr.toDataURL("image/" + t, this.option.backgroundColor && "rgba(0,0,0,0)" === this.option.backgroundColor.replace(" ", "") ? "#fff" : this.option.backgroundColor);
                var n = document.createElement("div");
                n.id = "__echarts_download_wrap__", n.style.cssText = "position:fixed;z-index:99999;display:block;top:0;left:0;background-color:rgba(33,33,33,0.5);text-align:center;width:100%;height:100%;line-height:" + document.documentElement.clientHeight + "px;";
                var a = document.createElement("a");
                a.href = i, a.setAttribute("download", (e.name ? e.name : this.option.title && (this.option.title.text || this.option.title.subtext) ? this.option.title.text || this.option.title.subtext : "ECharts") + "." + t), a.innerHTML = '<img style="vertical-align:middle" src="' + i + '" title="' + (window.ActiveXObject || "ActiveXObject" in window ? "Right Click->Save Picture As" : e.lang ? e.lang[0] : "Click Save") + '"/>', n.appendChild(a), document.body.appendChild(n), a = null, n = null, setTimeout(function () {
                    var e = document.getElementById("__echarts_download_wrap__");
                    e && (e.onclick = function () {
                        var e = document.getElementById("__echarts_download_wrap__");
                        e.onclick = null, e.innerHTML = "", document.body.removeChild(e), e = null
                    }, e = null)
                }, 500)
            },
            __onMagicType: function (e) {
                this._resetMark();
                var t = e.target._name;
                return this._magicType[t] || (this._magicType[t] = !0, t === s.CHART_TYPE_LINE ? this._magicType[s.CHART_TYPE_BAR] = !1 : t === s.CHART_TYPE_BAR && (this._magicType[s.CHART_TYPE_LINE] = !1), t === s.CHART_TYPE_PIE ? this._magicType[s.CHART_TYPE_FUNNEL] = !1 : t === s.CHART_TYPE_FUNNEL && (this._magicType[s.CHART_TYPE_PIE] = !1), t === s.CHART_TYPE_FORCE ? this._magicType[s.CHART_TYPE_CHORD] = !1 : t === s.CHART_TYPE_CHORD && (this._magicType[s.CHART_TYPE_FORCE] = !1), t === V ? this._magicType[U] = !1 : t === U && (this._magicType[V] = !1), this.messageCenter.dispatch(s.EVENT.MAGIC_TYPE_CHANGED, e.event, {
                    magicType: this._magicType
                }, this.myChart)), !0
            },
            setMagicType: function (e) {
                this._resetMark(), this._magicType = e, !this._isSilence && this.messageCenter.dispatch(s.EVENT.MAGIC_TYPE_CHANGED, null, {
                    magicType: this._magicType
                }, this.myChart)
            },
            __onCustomHandler: function (e) {
                var t = e.target.style.iconType,
                    i = this.option.toolbox.feature[t].onclick;
                "function" == typeof i && i.call(this, this.option)
            },
            reset: function (e, t) {
                if (t && this.clear(), this.query(e, "toolbox.show") && this.query(e, "toolbox.feature.magicType.show")) {
                    var i = e.toolbox.feature.magicType.type,
                        n = i.length;
                    for (this._magicMap = {}; n--;) this._magicMap[i[n]] = !0;
                    n = e.series.length;
                    for (var a, o; n--;) a = e.series[n].type, this._magicMap[a] && (o = e.xAxis instanceof Array ? e.xAxis[e.series[n].xAxisIndex || 0] : e.xAxis, o && "category" === (o.type || "category") && (o.__boundaryGap = null != o.boundaryGap ? o.boundaryGap : !0), o = e.yAxis instanceof Array ? e.yAxis[e.series[n].yAxisIndex || 0] : e.yAxis, o && "category" === o.type && (o.__boundaryGap = null != o.boundaryGap ? o.boundaryGap : !0), e.series[n].__type = a, e.series[n].__itemStyle = l.clone(e.series[n].itemStyle || {})), (this._magicMap[V] || this._magicMap[U]) && (e.series[n].__stack = e.series[n].stack)
                }
                this._magicType = t ? {} : this._magicType || {};
                for (var r in this._magicType)
                    if (this._magicType[r]) {
                        this.option = e, this.getMagicOption();
                        break
                    }
                var s = e.dataZoom;
                if (s && s.show) {
                    var h = null != s.start && s.start >= 0 && s.start <= 100 ? s.start : 0,
                        m = null != s.end && s.end >= 0 && s.end <= 100 ? s.end : 100;
                    h > m && (h += m, m = h - m, h -= m), this._zoomQueue = [{
                        start: h,
                        end: m,
                        start2: 0,
                        end2: 100
                    }]
                } else this._zoomQueue = []
            },
            getMagicOption: function () {
                var e, t;
                if (this._magicType[s.CHART_TYPE_LINE] || this._magicType[s.CHART_TYPE_BAR]) {
                    for (var i = this._magicType[s.CHART_TYPE_LINE] ? !1 : !0, n = 0, a = this.option.series.length; a > n; n++) t = this.option.series[n].type, (t == s.CHART_TYPE_LINE || t == s.CHART_TYPE_BAR) && (e = this.option.xAxis instanceof Array ? this.option.xAxis[this.option.series[n].xAxisIndex || 0] : this.option.xAxis, e && "category" === (e.type || "category") && (e.boundaryGap = i ? !0 : e.__boundaryGap), e = this.option.yAxis instanceof Array ? this.option.yAxis[this.option.series[n].yAxisIndex || 0] : this.option.yAxis, e && "category" === e.type && (e.boundaryGap = i ? !0 : e.__boundaryGap));
                    this._defaultMagic(s.CHART_TYPE_LINE, s.CHART_TYPE_BAR)
                }
                if (this._defaultMagic(s.CHART_TYPE_CHORD, s.CHART_TYPE_FORCE), this._defaultMagic(s.CHART_TYPE_PIE, s.CHART_TYPE_FUNNEL), this._magicType[V] || this._magicType[U])
                    for (var n = 0, a = this.option.series.length; a > n; n++) this._magicType[V] ? (this.option.series[n].stack = "_ECHARTS_STACK_KENER_2014_", t = V) : this._magicType[U] && (this.option.series[n].stack = null, t = U), this._featureOption[t + "Chart"] && l.merge(this.option.series[n], this._featureOption[t + "Chart"] || {}, !0);
                return this.option
            },
            _defaultMagic: function (e, t) {
                if (this._magicType[e] || this._magicType[t])
                    for (var i = 0, n = this.option.series.length; n > i; i++) {
                        var a = this.option.series[i].type;
                        (a == e || a == t) && (this.option.series[i].type = this._magicType[e] ? e : t, this.option.series[i].itemStyle = l.clone(this.option.series[i].__itemStyle), a = this.option.series[i].type, this._featureOption[a + "Chart"] && l.merge(this.option.series[i], this._featureOption[a + "Chart"] || {}, !0))
                    }
            },
            silence: function (e) {
                this._isSilence = e
            },
            resize: function () {
                this._resetMark(), this.clear(), this.option && this.option.toolbox && this.option.toolbox.show && this._buildShape(), this._dataView && this._dataView.resize()
            },
            hideDataView: function () {
                this._dataView && this._dataView.hide()
            },
            clear: function (e) {
                this.zr && (this.zr.delShape(this.shapeList), this.shapeList = [], e || (this.zr.delShape(this._markShapeList), this._markShapeList = []))
            },
            onbeforDispose: function () {
                this._dataView && (this._dataView.dispose(), this._dataView = null), this._markShapeList = null
            },
            refresh: function (e) {
                e && (this._resetMark(), this._resetZoom(), e.toolbox = this.reformOption(e.toolbox), this.option = e, this.clear(!0), e.toolbox.show && this._buildShape(), this.hideDataView())
            }
        }, l.inherits(t, i), e("../component").define("toolbox", t), t
    }), i("echarts/component", [], function () {
        var e = {},
            t = {};
        return e.define = function (i, n) {
            return t[i] = n, e
        }, e.get = function (e) {
            return t[e]
        }, e
    }), i("echarts/component/title", ["require", "./base", "zrender/shape/Text", "zrender/shape/Rectangle", "../config", "zrender/tool/util", "zrender/tool/area", "zrender/tool/color", "../component"], function (e) {
        function t(e, t, n, a, o) {
            i.call(this, e, t, n, a, o), this.refresh(a)
        }
        var i = e("./base"),
            n = e("zrender/shape/Text"),
            a = e("zrender/shape/Rectangle"),
            o = e("../config");
        o.title = {
            zlevel: 0,
            z: 6,
            show: !0,
            text: "",
            subtext: "",
            x: "left",
            y: "top",
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "#ccc",
            borderWidth: 0,
            padding: 5,
            itemGap: 5,
            textStyle: {
                fontSize: 18,
                fontWeight: "bolder",
                color: "#333"
            },
            subtextStyle: {
                color: "#aaa"
            }
        };
        var r = e("zrender/tool/util"),
            s = e("zrender/tool/area"),
            l = e("zrender/tool/color");
        return t.prototype = {
            type: o.COMPONENT_TYPE_TITLE,
            _buildShape: function () {
                if (this.titleOption.show) {
                    this._itemGroupLocation = this._getItemGroupLocation(), this._buildBackground(), this._buildItem();
                    for (var e = 0, t = this.shapeList.length; t > e; e++) this.zr.addShape(this.shapeList[e])
                }
            },
            _buildItem: function () {
                var e = this.titleOption.text,
                    t = this.titleOption.link,
                    i = this.titleOption.target,
                    a = this.titleOption.subtext,
                    o = this.titleOption.sublink,
                    r = this.titleOption.subtarget,
                    s = this.getFont(this.titleOption.textStyle),
                    h = this.getFont(this.titleOption.subtextStyle),
                    m = this._itemGroupLocation.x,
                    V = this._itemGroupLocation.y,
                    U = this._itemGroupLocation.width,
                    d = this._itemGroupLocation.height,
                    p = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            y: V,
                            color: this.titleOption.textStyle.color,
                            text: e,
                            textFont: s,
                            textBaseline: "top"
                        },
                        highlightStyle: {
                            color: l.lift(this.titleOption.textStyle.color, 1),
                            brushType: "fill"
                        },
                        hoverable: !1
                    };
                t && (p.hoverable = !0, p.clickable = !0, p.onclick = function () {
                    i && "self" == i ? window.location = t : window.open(t)
                });
                var c = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        y: V + d,
                        color: this.titleOption.subtextStyle.color,
                        text: a,
                        textFont: h,
                        textBaseline: "bottom"
                    },
                    highlightStyle: {
                        color: l.lift(this.titleOption.subtextStyle.color, 1),
                        brushType: "fill"
                    },
                    hoverable: !1
                };
                switch (o && (c.hoverable = !0, c.clickable = !0, c.onclick = function () {
                    r && "self" == r ? window.location = o : window.open(o)
                }), this.titleOption.x) {
                    case "center":
                        p.style.x = c.style.x = m + U / 2, p.style.textAlign = c.style.textAlign = "center";
                        break;
                    case "left":
                        p.style.x = c.style.x = m, p.style.textAlign = c.style.textAlign = "left";
                        break;
                    case "right":
                        p.style.x = c.style.x = m + U, p.style.textAlign = c.style.textAlign = "right";
                        break;
                    default:
                        m = this.titleOption.x - 0, m = isNaN(m) ? 0 : m, p.style.x = c.style.x = m
                }
                this.titleOption.textAlign && (p.style.textAlign = c.style.textAlign = this.titleOption.textAlign), this.shapeList.push(new n(p)), "" !== a && this.shapeList.push(new n(c))
            },
            _buildBackground: function () {
                var e = this.reformCssArray(this.titleOption.padding);
                this.shapeList.push(new a({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable: !1,
                    style: {
                        x: this._itemGroupLocation.x - e[3],
                        y: this._itemGroupLocation.y - e[0],
                        width: this._itemGroupLocation.width + e[3] + e[1],
                        height: this._itemGroupLocation.height + e[0] + e[2],
                        brushType: 0 === this.titleOption.borderWidth ? "fill" : "both",
                        color: this.titleOption.backgroundColor,
                        strokeColor: this.titleOption.borderColor,
                        lineWidth: this.titleOption.borderWidth
                    }
                }))
            },
            _getItemGroupLocation: function () {
                var e, t = this.reformCssArray(this.titleOption.padding),
                    i = this.titleOption.text,
                    n = this.titleOption.subtext,
                    a = this.getFont(this.titleOption.textStyle),
                    o = this.getFont(this.titleOption.subtextStyle),
                    r = Math.max(s.getTextWidth(i, a), s.getTextWidth(n, o)),
                    l = s.getTextHeight(i, a) + ("" === n ? 0 : this.titleOption.itemGap + s.getTextHeight(n, o)),
                    h = this.zr.getWidth();
                switch (this.titleOption.x) {
                    case "center":
                        e = Math.floor((h - r) / 2);
                        break;
                    case "left":
                        e = t[3] + this.titleOption.borderWidth;
                        break;
                    case "right":
                        e = h - r - t[1] - this.titleOption.borderWidth;
                        break;
                    default:
                        e = this.titleOption.x - 0, e = isNaN(e) ? 0 : e
                }
                var m, V = this.zr.getHeight();
                switch (this.titleOption.y) {
                    case "top":
                        m = t[0] + this.titleOption.borderWidth;
                        break;
                    case "bottom":
                        m = V - l - t[2] - this.titleOption.borderWidth;
                        break;
                    case "center":
                        m = Math.floor((V - l) / 2);
                        break;
                    default:
                        m = this.titleOption.y - 0, m = isNaN(m) ? 0 : m
                }
                return {
                    x: e,
                    y: m,
                    width: r,
                    height: l
                }
            },
            refresh: function (e) {
                e && (this.option = e, this.option.title = this.reformOption(this.option.title), this.titleOption = this.option.title, this.titleOption.textStyle = this.getTextStyle(this.titleOption.textStyle), this.titleOption.subtextStyle = this.getTextStyle(this.titleOption.subtextStyle)), this.clear(), this._buildShape()
            }
        }, r.inherits(t, i), e("../component").define("title", t), t
    }), i("echarts/component/tooltip", ["require", "./base", "../util/shape/Cross", "zrender/shape/Line", "zrender/shape/Rectangle", "../config", "../util/ecData", "zrender/config", "zrender/tool/event", "zrender/tool/area", "zrender/tool/color", "zrender/tool/util", "zrender/shape/Base", "../component"], function (e) {
        function t(e, t, o, r, s) {
            i.call(this, e, t, o, r, s), this.dom = s.dom;
            var l = this;
            l._onmousemove = function (e) {
                return l.__onmousemove(e)
            }, l._onglobalout = function (e) {
                return l.__onglobalout(e)
            }, this.zr.on(h.EVENT.MOUSEMOVE, l._onmousemove), this.zr.on(h.EVENT.GLOBALOUT, l._onglobalout), l._hide = function (e) {
                return l.__hide(e)
            }, l._tryShow = function (e) {
                return l.__tryShow(e)
            }, l._refixed = function (e) {
                return l.__refixed(e)
            }, l._setContent = function (e, t) {
                return l.__setContent(e, t)
            }, this._tDom = this._tDom || document.createElement("div"), this._tDom.onselectstart = function () {
                return !1
            }, this._tDom.onmouseover = function () {
                l._mousein = !0
            }, this._tDom.onmouseout = function () {
                l._mousein = !1
            }, this._tDom.className = "echarts-tooltip", this._tDom.style.position = "absolute", this.hasAppend = !1, this._axisLineShape && this.zr.delShape(this._axisLineShape.id), this._axisLineShape = new a({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                invisible: !0,
                hoverable: !1
            }), this.shapeList.push(this._axisLineShape), this.zr.addShape(this._axisLineShape), this._axisShadowShape && this.zr.delShape(this._axisShadowShape.id), this._axisShadowShape = new a({
                zlevel: this.getZlevelBase(),
                z: 1,
                invisible: !0,
                hoverable: !1
            }), this.shapeList.push(this._axisShadowShape), this.zr.addShape(this._axisShadowShape), this._axisCrossShape && this.zr.delShape(this._axisCrossShape.id), this._axisCrossShape = new n({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                invisible: !0,
                hoverable: !1
            }), this.shapeList.push(this._axisCrossShape), this.zr.addShape(this._axisCrossShape), this.showing = !1, this.refresh(r)
        }
        var i = e("./base"),
            n = e("../util/shape/Cross"),
            a = e("zrender/shape/Line"),
            o = e("zrender/shape/Rectangle"),
            r = new o({}),
            s = e("../config");
        s.tooltip = {
            zlevel: 1,
            z: 8,
            show: !0,
            showContent: !0,
            trigger: "item",
            islandFormatter: "{a} <br/>{b} : {c}",
            showDelay: 20,
            hideDelay: 100,
            transitionDuration: .4,
            enterable: !1,
            backgroundColor: "rgba(0,0,0,0.7)",
            borderColor: "#333",
            borderRadius: 4,
            borderWidth: 0,
            padding: 5,
            axisPointer: {
                type: "line",
                lineStyle: {
                    color: "#48b",
                    width: 2,
                    type: "solid"
                },
                crossStyle: {
                    color: "#1e90ff",
                    width: 1,
                    type: "dashed"
                },
                shadowStyle: {
                    color: "rgba(150,150,150,0.3)",
                    width: "auto",
                    type: "default"
                }
            },
            textStyle: {
                color: "#fff"
            }
        };
        var l = e("../util/ecData"),
            h = e("zrender/config"),
            m = e("zrender/tool/event"),
            V = e("zrender/tool/area"),
            U = e("zrender/tool/color"),
            d = e("zrender/tool/util"),
            p = e("zrender/shape/Base");
        return t.prototype = {
            type: s.COMPONENT_TYPE_TOOLTIP,
            _gCssText: "position:absolute;display:block;border-style:solid;white-space:nowrap;",
            _style: function (e) {
                if (!e) return "";
                var t = [];
                if (e.transitionDuration) {
                    var i = "left " + e.transitionDuration + "s,top " + e.transitionDuration + "s";
                    t.push("transition:" + i), t.push("-moz-transition:" + i), t.push("-webkit-transition:" + i), t.push("-o-transition:" + i)
                }
                e.backgroundColor && (t.push("background-Color:" + U.toHex(e.backgroundColor)), t.push("filter:alpha(opacity=70)"), t.push("background-Color:" + e.backgroundColor)), null != e.borderWidth && t.push("border-width:" + e.borderWidth + "px"), null != e.borderColor && t.push("border-color:" + e.borderColor), null != e.borderRadius && (t.push("border-radius:" + e.borderRadius + "px"), t.push("-moz-border-radius:" + e.borderRadius + "px"), t.push("-webkit-border-radius:" + e.borderRadius + "px"), t.push("-o-border-radius:" + e.borderRadius + "px"));
                var n = e.textStyle;
                n && (n.color && t.push("color:" + n.color), n.decoration && t.push("text-decoration:" + n.decoration), n.align && t.push("text-align:" + n.align), n.fontFamily && t.push("font-family:" + n.fontFamily), n.fontSize && t.push("font-size:" + n.fontSize + "px"), n.fontSize && t.push("line-height:" + Math.round(3 * n.fontSize / 2) + "px"), n.fontStyle && t.push("font-style:" + n.fontStyle), n.fontWeight && t.push("font-weight:" + n.fontWeight));
                var a = e.padding;
                return null != a && (a = this.reformCssArray(a), t.push("padding:" + a[0] + "px " + a[1] + "px " + a[2] + "px " + a[3] + "px")), t = t.join(";") + ";"
            },
            __hide: function () {
                this._lastDataIndex = -1, this._lastSeriesIndex = -1, this._lastItemTriggerId = -1, this._tDom && (this._tDom.style.display = "none");
                var e = !1;
                this._axisLineShape.invisible || (this._axisLineShape.invisible = !0,
                    this.zr.modShape(this._axisLineShape.id), e = !0), this._axisShadowShape.invisible || (this._axisShadowShape.invisible = !0, this.zr.modShape(this._axisShadowShape.id), e = !0), this._axisCrossShape.invisible || (this._axisCrossShape.invisible = !0, this.zr.modShape(this._axisCrossShape.id), e = !0), this._lastTipShape && this._lastTipShape.tipShape.length > 0 && (this.zr.delShape(this._lastTipShape.tipShape), this._lastTipShape = !1, this.shapeList.length = 2), e && this.zr.refreshNextFrame(), this.showing = !1
            },
            _show: function (e, t, i, n) {
                var a = this._tDom.offsetHeight,
                    o = this._tDom.offsetWidth;
                e && ("function" == typeof e && (e = e([t, i])), e instanceof Array && (t = e[0], i = e[1])), t + o > this._zrWidth && (t -= o + 40), i + a > this._zrHeight && (i -= a - 20), 20 > i && (i = 0), this._tDom.style.cssText = this._gCssText + this._defaultCssText + (n ? n : "") + "left:" + t + "px;top:" + i + "px;", (10 > a || 10 > o) && setTimeout(this._refixed, 20), this.showing = !0
            },
            __refixed: function () {
                if (this._tDom) {
                    var e = "",
                        t = this._tDom.offsetHeight,
                        i = this._tDom.offsetWidth;
                    this._tDom.offsetLeft + i > this._zrWidth && (e += "left:" + (this._zrWidth - i - 20) + "px;"), this._tDom.offsetTop + t > this._zrHeight && (e += "top:" + (this._zrHeight - t - 10) + "px;"), "" !== e && (this._tDom.style.cssText += e)
                }
            },
            __tryShow: function () {
                var e, t;
                if (this._curTarget) {
                    if ("island" === this._curTarget._type && this.option.tooltip.show) return void this._showItemTrigger();
                    var i = l.get(this._curTarget, "series"),
                        n = l.get(this._curTarget, "data");
                    e = this.deepQuery([n, i, this.option], "tooltip.show"), null != i && null != n && e ? (t = this.deepQuery([n, i, this.option], "tooltip.trigger"), "axis" === t ? this._showAxisTrigger(i.xAxisIndex, i.yAxisIndex, l.get(this._curTarget, "dataIndex")) : this._showItemTrigger()) : (clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), this._hidingTicket = setTimeout(this._hide, this._hideDelay))
                } else this._findPolarTrigger() || this._findAxisTrigger()
            },
            _findAxisTrigger: function () {
                if (!this.component.xAxis || !this.component.yAxis) return void (this._hidingTicket = setTimeout(this._hide, this._hideDelay));
                for (var e, t, i = this.option.series, n = 0, a = i.length; a > n; n++)
                    if ("axis" === this.deepQuery([i[n], this.option], "tooltip.trigger")) return e = i[n].xAxisIndex || 0, t = i[n].yAxisIndex || 0, this.component.xAxis.getAxis(e) && this.component.xAxis.getAxis(e).type === s.COMPONENT_TYPE_AXIS_CATEGORY ? void this._showAxisTrigger(e, t, this._getNearestDataIndex("x", this.component.xAxis.getAxis(e))) : this.component.yAxis.getAxis(t) && this.component.yAxis.getAxis(t).type === s.COMPONENT_TYPE_AXIS_CATEGORY ? void this._showAxisTrigger(e, t, this._getNearestDataIndex("y", this.component.yAxis.getAxis(t))) : void this._showAxisTrigger(e, t, -1);
                "cross" === this.option.tooltip.axisPointer.type && this._showAxisTrigger(-1, -1, -1)
            },
            _findPolarTrigger: function () {
                if (!this.component.polar) return !1;
                var e, t = m.getX(this._event),
                    i = m.getY(this._event),
                    n = this.component.polar.getNearestIndex([t, i]);
                return n ? (e = n.valueIndex, n = n.polarIndex) : n = -1, -1 != n ? this._showPolarTrigger(n, e) : !1
            },
            _getNearestDataIndex: function (e, t) {
                var i = -1,
                    n = m.getX(this._event),
                    a = m.getY(this._event);
                if ("x" === e) {
                    for (var o, r, s = this.component.grid.getXend(), l = t.getCoordByIndex(i); s > l && (r = l, n >= l);) o = l, l = t.getCoordByIndex(++i);
                    return 0 >= i ? i = 0 : r - n >= n - o ? i -= 1 : null == t.getNameByIndex(i) && (i -= 1), i
                }
                for (var h, V, U = this.component.grid.getY(), l = t.getCoordByIndex(i); l > U && (h = l, l >= a);) V = l, l = t.getCoordByIndex(++i);
                return 0 >= i ? i = 0 : a - h >= V - a ? i -= 1 : null == t.getNameByIndex(i) && (i -= 1), i
            },
            _showAxisTrigger: function (e, t, i) {
                if (!this._event.connectTrigger && this.messageCenter.dispatch(s.EVENT.TOOLTIP_IN_GRID, this._event, null, this.myChart), null == this.component.xAxis || null == this.component.yAxis || null == e || null == t) return clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), void (this._hidingTicket = setTimeout(this._hide, this._hideDelay));
                var n, a, o, r, l = this.option.series,
                    h = [],
                    V = [],
                    U = "";
                if ("axis" === this.option.tooltip.trigger) {
                    if (!this.option.tooltip.show) return;
                    a = this.option.tooltip.formatter, o = this.option.tooltip.position
                }
                var d, p, c = -1 != e && this.component.xAxis.getAxis(e).type === s.COMPONENT_TYPE_AXIS_CATEGORY ? "xAxis" : -1 != t && this.component.yAxis.getAxis(t).type === s.COMPONENT_TYPE_AXIS_CATEGORY ? "yAxis" : !1;
                if (c) {
                    var u = "xAxis" == c ? e : t;
                    n = this.component[c].getAxis(u);
                    for (var y = 0, g = l.length; g > y; y++) this._isSelected(l[y].name) && l[y][c + "Index"] === u && "axis" === this.deepQuery([l[y], this.option], "tooltip.trigger") && (r = this.query(l[y], "tooltip.showContent") || r, a = this.query(l[y], "tooltip.formatter") || a, o = this.query(l[y], "tooltip.position") || o, U += this._style(this.query(l[y], "tooltip")), null != l[y].stack && "xAxis" == c ? (h.unshift(l[y]), V.unshift(y)) : (h.push(l[y]), V.push(y)));
                    this.messageCenter.dispatch(s.EVENT.TOOLTIP_HOVER, this._event, {
                        seriesIndex: V,
                        dataIndex: i
                    }, this.myChart);
                    var b;
                    "xAxis" == c ? (d = this.subPixelOptimize(n.getCoordByIndex(i), this._axisLineWidth), p = m.getY(this._event), b = [d, this.component.grid.getY(), d, this.component.grid.getYend()]) : (d = m.getX(this._event), p = this.subPixelOptimize(n.getCoordByIndex(i), this._axisLineWidth), b = [this.component.grid.getX(), p, this.component.grid.getXend(), p]), this._styleAxisPointer(h, b[0], b[1], b[2], b[3], n.getGap(), d, p)
                } else d = m.getX(this._event), p = m.getY(this._event), this._styleAxisPointer(l, this.component.grid.getX(), p, this.component.grid.getXend(), p, 0, d, p), i >= 0 ? this._showItemTrigger(!0) : (clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), this._tDom.style.display = "none");
                if (h.length > 0) {
                    if (this._lastItemTriggerId = -1, this._lastDataIndex != i || this._lastSeriesIndex != V[0]) {
                        this._lastDataIndex = i, this._lastSeriesIndex = V[0];
                        var f, k;
                        if ("function" == typeof a) {
                            for (var x = [], y = 0, g = h.length; g > y; y++) f = h[y].data[i], k = this.getDataFromOption(f, "-"), x.push({
                                seriesIndex: V[y],
                                seriesName: h[y].name || "",
                                series: h[y],
                                dataIndex: i,
                                data: f,
                                name: n.getNameByIndex(i),
                                value: k,
                                0: h[y].name || "",
                                1: n.getNameByIndex(i),
                                2: k,
                                3: f
                            });
                            this._curTicket = "axis:" + i, this._tDom.innerHTML = a.call(this.myChart, x, this._curTicket, this._setContent)
                        } else if ("string" == typeof a) {
                            this._curTicket = 0 / 0, a = a.replace("{a}", "{a0}").replace("{b}", "{b0}").replace("{c}", "{c0}");
                            for (var y = 0, g = h.length; g > y; y++) a = a.replace("{a" + y + "}", this._encodeHTML(h[y].name || "")), a = a.replace("{b" + y + "}", this._encodeHTML(n.getNameByIndex(i))), f = h[y].data[i], f = this.getDataFromOption(f, "-"), a = a.replace("{c" + y + "}", f instanceof Array ? f : this.numAddCommas(f));
                            this._tDom.innerHTML = a
                        } else {
                            this._curTicket = 0 / 0, a = this._encodeHTML(n.getNameByIndex(i));
                            for (var y = 0, g = h.length; g > y; y++) a += "<br/>" + this._encodeHTML(h[y].name || "") + " : ", f = h[y].data[i], f = this.getDataFromOption(f, "-"), a += f instanceof Array ? f : this.numAddCommas(f);
                            this._tDom.innerHTML = a
                        }
                    }
                    if (r === !1 || !this.option.tooltip.showContent) return;
                    this.hasAppend || (this._tDom.style.left = this._zrWidth / 2 + "px", this._tDom.style.top = this._zrHeight / 2 + "px", this.dom.firstChild.appendChild(this._tDom), this.hasAppend = !0), this._show(o, d + 10, p + 10, U)
                }
            },
            _showPolarTrigger: function (e, t) {
                if (null == this.component.polar || null == e || null == t || 0 > t) return !1;
                var i, n, a, o = this.option.series,
                    r = [],
                    s = [],
                    l = "";
                if ("axis" === this.option.tooltip.trigger) {
                    if (!this.option.tooltip.show) return !1;
                    i = this.option.tooltip.formatter, n = this.option.tooltip.position
                }
                for (var h = this.option.polar[e].indicator[t].text, V = 0, U = o.length; U > V; V++) this._isSelected(o[V].name) && o[V].polarIndex === e && "axis" === this.deepQuery([o[V], this.option], "tooltip.trigger") && (a = this.query(o[V], "tooltip.showContent") || a, i = this.query(o[V], "tooltip.formatter") || i, n = this.query(o[V], "tooltip.position") || n, l += this._style(this.query(o[V], "tooltip")), r.push(o[V]), s.push(V));
                if (r.length > 0) {
                    for (var d, p, c, u = [], V = 0, U = r.length; U > V; V++) {
                        d = r[V].data;
                        for (var y = 0, g = d.length; g > y; y++) p = d[y], this._isSelected(p.name) && (p = null != p ? p : {
                            name: "",
                            value: {
                                dataIndex: "-"
                            }
                        }, c = this.getDataFromOption(p.value[t]), u.push({
                            seriesIndex: s[V],
                            seriesName: r[V].name || "",
                            series: r[V],
                            dataIndex: t,
                            data: p,
                            name: p.name,
                            indicator: h,
                            value: c,
                            0: r[V].name || "",
                            1: p.name,
                            2: c,
                            3: h
                        }))
                    }
                    if (u.length <= 0) return;
                    if (this._lastItemTriggerId = -1, this._lastDataIndex != t || this._lastSeriesIndex != s[0])
                        if (this._lastDataIndex = t, this._lastSeriesIndex = s[0], "function" == typeof i) this._curTicket = "axis:" + t, this._tDom.innerHTML = i.call(this.myChart, u, this._curTicket, this._setContent);
                        else if ("string" == typeof i) {
                            i = i.replace("{a}", "{a0}").replace("{b}", "{b0}").replace("{c}", "{c0}").replace("{d}", "{d0}");
                            for (var V = 0, U = u.length; U > V; V++) i = i.replace("{a" + V + "}", this._encodeHTML(u[V].seriesName)), i = i.replace("{b" + V + "}", this._encodeHTML(u[V].name)), i = i.replace("{c" + V + "}", this.numAddCommas(u[V].value)), i = i.replace("{d" + V + "}", this._encodeHTML(u[V].indicator));
                            this._tDom.innerHTML = i
                        } else {
                            i = this._encodeHTML(u[0].name) + "<br/>" + this._encodeHTML(u[0].indicator) + " : " + this.numAddCommas(u[0].value);
                            for (var V = 1, U = u.length; U > V; V++) i += "<br/>" + this._encodeHTML(u[V].name) + "<br/>", i += this._encodeHTML(u[V].indicator) + " : " + this.numAddCommas(u[V].value);
                            this._tDom.innerHTML = i
                        }
                    if (a === !1 || !this.option.tooltip.showContent) return;
                    return this.hasAppend || (this._tDom.style.left = this._zrWidth / 2 + "px", this._tDom.style.top = this._zrHeight / 2 + "px", this.dom.firstChild.appendChild(this._tDom), this.hasAppend = !0), this._show(n, m.getX(this._event), m.getY(this._event), l), !0
                }
            },
            _showItemTrigger: function (e) {
                if (this._curTarget) {
                    var t, i, n, a = l.get(this._curTarget, "series"),
                        o = l.get(this._curTarget, "seriesIndex"),
                        r = l.get(this._curTarget, "data"),
                        h = l.get(this._curTarget, "dataIndex"),
                        V = l.get(this._curTarget, "name"),
                        U = l.get(this._curTarget, "value"),
                        d = l.get(this._curTarget, "special"),
                        p = l.get(this._curTarget, "special2"),
                        c = [r, a, this.option],
                        u = "";
                    if ("island" != this._curTarget._type) {
                        var y = e ? "axis" : "item";
                        this.option.tooltip.trigger === y && (t = this.option.tooltip.formatter, i = this.option.tooltip.position), this.query(a, "tooltip.trigger") === y && (n = this.query(a, "tooltip.showContent") || n, t = this.query(a, "tooltip.formatter") || t, i = this.query(a, "tooltip.position") || i, u += this._style(this.query(a, "tooltip"))), n = this.query(r, "tooltip.showContent") || n, t = this.query(r, "tooltip.formatter") || t, i = this.query(r, "tooltip.position") || i, u += this._style(this.query(r, "tooltip"))
                    } else this._lastItemTriggerId = 0 / 0, n = this.deepQuery(c, "tooltip.showContent"), t = this.deepQuery(c, "tooltip.islandFormatter"), i = this.deepQuery(c, "tooltip.islandPosition");
                    this._lastDataIndex = -1, this._lastSeriesIndex = -1, this._lastItemTriggerId !== this._curTarget.id && (this._lastItemTriggerId = this._curTarget.id, "function" == typeof t ? (this._curTicket = (a.name || "") + ":" + h, this._tDom.innerHTML = t.call(this.myChart, {
                        seriesIndex: o,
                        seriesName: a.name || "",
                        series: a,
                        dataIndex: h,
                        data: r,
                        name: V,
                        value: U,
                        percent: d,
                        indicator: d,
                        value2: p,
                        indicator2: p,
                        0: a.name || "",
                        1: V,
                        2: U,
                        3: d,
                        4: p,
                        5: r,
                        6: o,
                        7: h
                    }, this._curTicket, this._setContent)) : "string" == typeof t ? (this._curTicket = 0 / 0, t = t.replace("{a}", "{a0}").replace("{b}", "{b0}").replace("{c}", "{c0}"), t = t.replace("{a0}", this._encodeHTML(a.name || "")).replace("{b0}", this._encodeHTML(V)).replace("{c0}", U instanceof Array ? U : this.numAddCommas(U)), t = t.replace("{d}", "{d0}").replace("{d0}", d || ""), t = t.replace("{e}", "{e0}").replace("{e0}", l.get(this._curTarget, "special2") || ""), this._tDom.innerHTML = t) : (this._curTicket = 0 / 0, this._tDom.innerHTML = a.type === s.CHART_TYPE_RADAR && d ? this._itemFormatter.radar.call(this, a, V, U, d) : a.type === s.CHART_TYPE_EVENTRIVER ? this._itemFormatter.eventRiver.call(this, a, V, U, r) : "" + (null != a.name ? this._encodeHTML(a.name) + "<br/>" : "") + ("" === V ? "" : this._encodeHTML(V) + " : ") + (U instanceof Array ? U : this.numAddCommas(U))));
                    var g = m.getX(this._event),
                        b = m.getY(this._event);
                    this.deepQuery(c, "tooltip.axisPointer.show") && this.component.grid ? this._styleAxisPointer([a], this.component.grid.getX(), b, this.component.grid.getXend(), b, 0, g, b) : this._hide(), n !== !1 && this.option.tooltip.showContent && (this.hasAppend || (this._tDom.style.left = this._zrWidth / 2 + "px", this._tDom.style.top = this._zrHeight / 2 + "px", this.dom.firstChild.appendChild(this._tDom), this.hasAppend = !0), this._show(i, g + 20, b - 20, u))
                }
            },
            _itemFormatter: {
                radar: function (e, t, i, n) {
                    var a = "";
                    a += this._encodeHTML("" === t ? e.name || "" : t), a += "" === a ? "" : "<br />";
                    for (var o = 0; o < n.length; o++) a += this._encodeHTML(n[o].text) + " : " + this.numAddCommas(i[o]) + "<br />";
                    return a
                },
                chord: function (e, t, i, n, a) {
                    if (null == a) return this._encodeHTML(t) + " (" + this.numAddCommas(i) + ")";
                    var o = this._encodeHTML(t),
                        r = this._encodeHTML(n);
                    return "" + (null != e.name ? this._encodeHTML(e.name) + "<br/>" : "") + o + " -> " + r + " (" + this.numAddCommas(i) + ")<br />" + r + " -> " + o + " (" + this.numAddCommas(a) + ")"
                },
                eventRiver: function (e, t, i, n) {
                    var a = "";
                    a += this._encodeHTML("" === e.name ? "" : e.name + " : "), a += this._encodeHTML(t), a += "" === a ? "" : "<br />", n = n.evolution;
                    for (var o = 0, r = n.length; r > o; o++) a += '<div style="padding-top:5px;">', n[o].detail && (n[o].detail.img && (a += '<img src="' + n[o].detail.img + '" style="float:left;width:40px;height:40px;">'), a += '<div style="margin-left:45px;">' + n[o].time + "<br/>", a += '<a href="' + n[o].detail.link + '" target="_blank">', a += n[o].detail.text + "</a></div>", a += "</div>");
                    return a
                }
            },
            _styleAxisPointer: function (e, t, i, n, a, o, r, s) {
                if (e.length > 0) {
                    var l, h, m = this.option.tooltip.axisPointer,
                        V = m.type,
                        U = {
                            line: {},
                            cross: {},
                            shadow: {}
                        };
                    for (var d in U) U[d].color = m[d + "Style"].color, U[d].width = m[d + "Style"].width, U[d].type = m[d + "Style"].type;
                    for (var p = 0, c = e.length; c > p; p++) l = e[p], h = this.query(l, "tooltip.axisPointer.type"), V = h || V, h && (U[h].color = this.query(l, "tooltip.axisPointer." + h + "Style.color") || U[h].color, U[h].width = this.query(l, "tooltip.axisPointer." + h + "Style.width") || U[h].width, U[h].type = this.query(l, "tooltip.axisPointer." + h + "Style.type") || U[h].type);
                    if ("line" === V) {
                        var u = U.line.width,
                            y = t == n;
                        this._axisLineShape.style = {
                            xStart: y ? this.subPixelOptimize(t, u) : t,
                            yStart: y ? i : this.subPixelOptimize(i, u),
                            xEnd: y ? this.subPixelOptimize(n, u) : n,
                            yEnd: y ? a : this.subPixelOptimize(a, u),
                            strokeColor: U.line.color,
                            lineWidth: u,
                            lineType: U.line.type
                        }, this._axisLineShape.invisible = !1, this.zr.modShape(this._axisLineShape.id)
                    } else if ("cross" === V) {
                        var g = U.cross.width;
                        this._axisCrossShape.style = {
                            brushType: "stroke",
                            rect: this.component.grid.getArea(),
                            x: this.subPixelOptimize(r, g),
                            y: this.subPixelOptimize(s, g),
                            text: ("( " + this.component.xAxis.getAxis(0).getValueFromCoord(r) + " , " + this.component.yAxis.getAxis(0).getValueFromCoord(s) + " )").replace("  , ", " ").replace(" ,  ", " "),
                            textPosition: "specific",
                            strokeColor: U.cross.color,
                            lineWidth: g,
                            lineType: U.cross.type
                        }, this.component.grid.getXend() - r > 100 ? (this._axisCrossShape.style.textAlign = "left", this._axisCrossShape.style.textX = r + 10) : (this._axisCrossShape.style.textAlign = "right", this._axisCrossShape.style.textX = r - 10), s - this.component.grid.getY() > 50 ? (this._axisCrossShape.style.textBaseline = "bottom", this._axisCrossShape.style.textY = s - 10) : (this._axisCrossShape.style.textBaseline = "top", this._axisCrossShape.style.textY = s + 10), this._axisCrossShape.invisible = !1, this.zr.modShape(this._axisCrossShape.id)
                    } else "shadow" === V && ((null == U.shadow.width || "auto" === U.shadow.width || isNaN(U.shadow.width)) && (U.shadow.width = o), t === n ? Math.abs(this.component.grid.getX() - t) < 2 ? (U.shadow.width /= 2, t = n += U.shadow.width / 2) : Math.abs(this.component.grid.getXend() - t) < 2 && (U.shadow.width /= 2, t = n -= U.shadow.width / 2) : i === a && (Math.abs(this.component.grid.getY() - i) < 2 ? (U.shadow.width /= 2, i = a += U.shadow.width / 2) : Math.abs(this.component.grid.getYend() - i) < 2 && (U.shadow.width /= 2, i = a -= U.shadow.width / 2)), this._axisShadowShape.style = {
                        xStart: t,
                        yStart: i,
                        xEnd: n,
                        yEnd: a,
                        strokeColor: U.shadow.color,
                        lineWidth: U.shadow.width
                    }, this._axisShadowShape.invisible = !1, this.zr.modShape(this._axisShadowShape.id));
                    this.zr.refreshNextFrame()
                }
            },
            __onmousemove: function (e) {
                if (clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), !this._mousein || !this._enterable) {
                    var t = e.target,
                        i = m.getX(e.event),
                        n = m.getY(e.event);
                    if (t) {
                        this._curTarget = t, this._event = e.event, this._event.zrenderX = i, this._event.zrenderY = n;
                        var a;
                        if (this._needAxisTrigger && this.component.polar && -1 != (a = this.component.polar.isInside([i, n])))
                            for (var o = this.option.series, l = 0, h = o.length; h > l; l++)
                                if (o[l].polarIndex === a && "axis" === this.deepQuery([o[l], this.option], "tooltip.trigger")) {
                                    this._curTarget = null;
                                    break
                                }
                        this._showingTicket = setTimeout(this._tryShow, this._showDelay)
                    } else this._curTarget = !1, this._event = e.event, this._event.zrenderX = i, this._event.zrenderY = n, this._needAxisTrigger && this.component.grid && V.isInside(r, this.component.grid.getArea(), i, n) ? this._showingTicket = setTimeout(this._tryShow, this._showDelay) : this._needAxisTrigger && this.component.polar && -1 != this.component.polar.isInside([i, n]) ? this._showingTicket = setTimeout(this._tryShow, this._showDelay) : (!this._event.connectTrigger && this.messageCenter.dispatch(s.EVENT.TOOLTIP_OUT_GRID, this._event, null, this.myChart), this._hidingTicket = setTimeout(this._hide, this._hideDelay))
                }
            },
            __onglobalout: function () {
                clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), this._hidingTicket = setTimeout(this._hide, this._hideDelay)
            },
            __setContent: function (e, t) {
                this._tDom && (e === this._curTicket && (this._tDom.innerHTML = t), setTimeout(this._refixed, 20))
            },
            ontooltipHover: function (e, t) {
                if (!this._lastTipShape || this._lastTipShape && this._lastTipShape.dataIndex != e.dataIndex) {
                    this._lastTipShape && this._lastTipShape.tipShape.length > 0 && (this.zr.delShape(this._lastTipShape.tipShape), this.shapeList.length = 2);
                    for (var i = 0, n = t.length; n > i; i++) t[i].zlevel = this.getZlevelBase(), t[i].z = this.getZBase(), t[i].style = p.prototype.getHighlightStyle(t[i].style, t[i].highlightStyle), t[i].draggable = !1, t[i].hoverable = !1, t[i].clickable = !1, t[i].ondragend = null, t[i].ondragover = null, t[i].ondrop = null, this.shapeList.push(t[i]), this.zr.addShape(t[i]);
                    this._lastTipShape = {
                        dataIndex: e.dataIndex,
                        tipShape: t
                    }
                }
            },
            ondragend: function () {
                this._hide()
            },
            onlegendSelected: function (e) {
                this._selectedMap = e.selected
            },
            _setSelectedMap: function () {
                this._selectedMap = this.component.legend ? d.clone(this.component.legend.getSelectedMap()) : {}
            },
            _isSelected: function (e) {
                return null != this._selectedMap[e] ? this._selectedMap[e] : !0
            },
            showTip: function (e) {
                if (e) {
                    var t, i = this.option.series;
                    if (null != e.seriesIndex) t = e.seriesIndex;
                    else
                        for (var n = e.seriesName, a = 0, o = i.length; o > a; a++)
                            if (i[a].name === n) {
                                t = a;
                                break
                            } var r = i[t];
                    if (null != r) {
                        var m = this.myChart.chart[r.type],
                            V = "axis" === this.deepQuery([r, this.option], "tooltip.trigger");
                        if (m)
                            if (V) {
                                var U = e.dataIndex;
                                switch (m.type) {
                                    case s.CHART_TYPE_LINE:
                                    case s.CHART_TYPE_BAR:
                                    case s.CHART_TYPE_K:
                                    case s.CHART_TYPE_RADAR:
                                        if (null == this.component.polar || r.data[0].value.length <= U) return;
                                        var d = r.polarIndex || 0,
                                            p = this.component.polar.getVector(d, U, "max");
                                        this._event = {
                                            zrenderX: p[0],
                                            zrenderY: p[1]
                                        }, this._showPolarTrigger(d, U)
                                }
                            } else {
                                var c, u, y = m.shapeList;
                                switch (m.type) {
                                    case s.CHART_TYPE_LINE:
                                    case s.CHART_TYPE_BAR:
                                    case s.CHART_TYPE_K:
                                    case s.CHART_TYPE_TREEMAP:
                                    case s.CHART_TYPE_SCATTER:
                                        for (var U = e.dataIndex, a = 0, o = y.length; o > a; a++)
                                            if (null == y[a]._mark && l.get(y[a], "seriesIndex") == t && l.get(y[a], "dataIndex") == U) {
                                                this._curTarget = y[a], c = y[a].style.x, u = m.type != s.CHART_TYPE_K ? y[a].style.y : y[a].style.y[0];
                                                break
                                            }
                                        break;
                                    case s.CHART_TYPE_RADAR:
                                        for (var U = e.dataIndex, a = 0, o = y.length; o > a; a++)
                                            if ("polygon" === y[a].type && l.get(y[a], "seriesIndex") == t && l.get(y[a], "dataIndex") == U) {
                                                this._curTarget = y[a];
                                                var p = this.component.polar.getCenter(r.polarIndex || 0);
                                                c = p[0], u = p[1];
                                                break
                                            }
                                        break;
                                    case s.CHART_TYPE_PIE:
                                        for (var g = e.name, a = 0, o = y.length; o > a; a++)
                                            if ("sector" === y[a].type && l.get(y[a], "seriesIndex") == t && l.get(y[a], "name") == g) {
                                                this._curTarget = y[a];
                                                var b = this._curTarget.style,
                                                    f = (b.startAngle + b.endAngle) / 2 * Math.PI / 180;
                                                c = this._curTarget.style.x + Math.cos(f) * b.r / 1.5, u = this._curTarget.style.y - Math.sin(f) * b.r / 1.5;
                                                break
                                            }
                                        break;
                                    case s.CHART_TYPE_MAP:
                                        for (var g = e.name, k = r.mapType, a = 0, o = y.length; o > a; a++)
                                            if ("text" === y[a].type && y[a]._mapType === k && y[a].style._name === g) {
                                                this._curTarget = y[a], c = this._curTarget.style.x + this._curTarget.position[0], u = this._curTarget.style.y + this._curTarget.position[1];
                                                break
                                            }
                                        break;
                                    case s.CHART_TYPE_CHORD:
                                        for (var g = e.name, a = 0, o = y.length; o > a; a++)
                                            if ("sector" === y[a].type && l.get(y[a], "name") == g) {
                                                this._curTarget = y[a];
                                                var b = this._curTarget.style,
                                                    f = (b.startAngle + b.endAngle) / 2 * Math.PI / 180;
                                                return c = this._curTarget.style.x + Math.cos(f) * (b.r - 2), u = this._curTarget.style.y - Math.sin(f) * (b.r - 2), void this.zr.trigger(h.EVENT.MOUSEMOVE, {
                                                    zrenderX: c,
                                                    zrenderY: u
                                                })
                                            }
                                        break;
                                    case s.CHART_TYPE_FORCE:
                                        for (var g = e.name, a = 0, o = y.length; o > a; a++)
                                            if ("circle" === y[a].type && l.get(y[a], "name") == g) {
                                                this._curTarget = y[a], c = this._curTarget.position[0], u = this._curTarget.position[1];
                                                break
                                            }
                                }
                                null != c && null != u && (this._event = {
                                    zrenderX: c,
                                    zrenderY: u
                                }, this.zr.addHoverShape(this._curTarget), this.zr.refreshHover(), this._showItemTrigger())
                            }
                    }
                }
            },
            hideTip: function () {
                this._hide()
            },
            refresh: function (e) {
                if (this._zrHeight = this.zr.getHeight(), this._zrWidth = this.zr.getWidth(), this._lastTipShape && this._lastTipShape.tipShape.length > 0 && this.zr.delShape(this._lastTipShape.tipShape), this._lastTipShape = !1, this.shapeList.length = 2, this._lastDataIndex = -1, this._lastSeriesIndex = -1, this._lastItemTriggerId = -1, e) {
                    this.option = e, this.option.tooltip = this.reformOption(this.option.tooltip), this.option.tooltip.textStyle = d.merge(this.option.tooltip.textStyle, this.ecTheme.textStyle), this._needAxisTrigger = !1, "axis" === this.option.tooltip.trigger && (this._needAxisTrigger = !0);
                    for (var t = this.option.series, i = 0, n = t.length; n > i; i++)
                        if ("axis" === this.query(t[i], "tooltip.trigger")) {
                            this._needAxisTrigger = !0;
                            break
                        }
                    this._showDelay = this.option.tooltip.showDelay, this._hideDelay = this.option.tooltip.hideDelay, this._defaultCssText = this._style(this.option.tooltip), this._setSelectedMap(), this._axisLineWidth = this.option.tooltip.axisPointer.lineStyle.width, this._enterable = this.option.tooltip.enterable, !this._enterable && this._tDom.className.indexOf(h.elementClassName) < 0 && (this._tDom.className += " " + h.elementClassName)
                }
                if (this.showing) {
                    var a = this;
                    setTimeout(function () {
                        a.zr.trigger(h.EVENT.MOUSEMOVE, a.zr.handler._event)
                    }, 50)
                }
            },
            onbeforDispose: function () {
                this._lastTipShape && this._lastTipShape.tipShape.length > 0 && this.zr.delShape(this._lastTipShape.tipShape), clearTimeout(this._hidingTicket), clearTimeout(this._showingTicket), this.zr.un(h.EVENT.MOUSEMOVE, this._onmousemove), this.zr.un(h.EVENT.GLOBALOUT, this._onglobalout), this.hasAppend && this.dom.firstChild && this.dom.firstChild.removeChild(this._tDom), this._tDom = null
            },
            _encodeHTML: function (e) {
                return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
            }
        }, d.inherits(t, i), e("../component").define("tooltip", t), t
    }), i("echarts/component/legend", ["require", "./base", "zrender/shape/Text", "zrender/shape/Rectangle", "zrender/shape/Sector", "../util/shape/Icon", "../util/shape/Candle", "../config", "zrender/tool/util", "zrender/tool/area", "../component"], function (e) {
        function t(e, t, n, a, o) {
            if (!this.query(a, "legend.data")) return void console.error("option.legend.data has not been defined.");
            i.call(this, e, t, n, a, o);
            var r = this;
            r._legendSelected = function (e) {
                r.__legendSelected(e)
            }, r._dispatchHoverLink = function (e) {
                return r.__dispatchHoverLink(e)
            }, this._colorIndex = 0, this._colorMap = {}, this._selectedMap = {}, this._hasDataMap = {}, this.refresh(a)
        }
        var i = e("./base"),
            n = e("zrender/shape/Text"),
            a = e("zrender/shape/Rectangle"),
            o = e("zrender/shape/Sector"),
            r = e("../util/shape/Icon"),
            s = e("../util/shape/Candle"),
            l = e("../config");
        l.legend = {
            zlevel: 0,
            z: 4,
            show: !0,
            orient: "horizontal",
            x: "center",
            y: "top",
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "#ccc",
            borderWidth: 0,
            padding: 5,
            itemGap: 10,
            itemWidth: 20,
            itemHeight: 14,
            textStyle: {
                color: "#333"
            },
            selectedMode: !0
        };
        var h = e("zrender/tool/util"),
            m = e("zrender/tool/area");
        t.prototype = {
            type: l.COMPONENT_TYPE_LEGEND,
            _buildShape: function () {
                if (this.legendOption.show) {
                    this._itemGroupLocation = this._getItemGroupLocation(), this._buildBackground(), this._buildItem();
                    for (var e = 0, t = this.shapeList.length; t > e; e++) this.zr.addShape(this.shapeList[e])
                }
            },
            _buildItem: function () {
                var e, t, i, a, o, s, l, V, U = this.legendOption.data,
                    d = U.length,
                    p = this.legendOption.textStyle,
                    c = this.zr.getWidth(),
                    u = this.zr.getHeight(),
                    y = this._itemGroupLocation.x,
                    g = this._itemGroupLocation.y,
                    b = this.legendOption.itemWidth,
                    f = this.legendOption.itemHeight,
                    k = this.legendOption.itemGap;
                "vertical" === this.legendOption.orient && "right" === this.legendOption.x && (y = this._itemGroupLocation.x + this._itemGroupLocation.width - b);
                for (var x = 0; d > x; x++) o = h.merge(U[x].textStyle || {}, p), s = this.getFont(o), e = this._getName(U[x]), l = this._getFormatterName(e), "" !== e ? (t = U[x].icon || this._getSomethingByName(e).type, V = this.getColor(e), "horizontal" === this.legendOption.orient ? 200 > c - y && b + 5 + m.getTextWidth(l, s) + (x === d - 1 || "" === U[x + 1] ? 0 : k) >= c - y && (y = this._itemGroupLocation.x, g += f + k) : 200 > u - g && f + (x === d - 1 || "" === U[x + 1] ? 0 : k) >= u - g && ("right" === this.legendOption.x ? y -= this._itemGroupLocation.maxWidth + k : y += this._itemGroupLocation.maxWidth + k, g = this._itemGroupLocation.y), i = this._getItemShapeByType(y, g, b, f, this._selectedMap[e] && this._hasDataMap[e] ? V : "#ccc", t, V), i._name = e, i = new r(i), a = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: y + b + 5,
                        y: g + f / 2,
                        color: this._selectedMap[e] ? "auto" === o.color ? V : o.color : "#ccc",
                        text: l,
                        textFont: s,
                        textBaseline: "middle"
                    },
                    highlightStyle: {
                        color: V,
                        brushType: "fill"
                    },
                    hoverable: !!this.legendOption.selectedMode,
                    clickable: !!this.legendOption.selectedMode
                }, "vertical" === this.legendOption.orient && "right" === this.legendOption.x && (a.style.x -= b + 10, a.style.textAlign = "right"), a._name = e, a = new n(a), this.legendOption.selectedMode && (i.onclick = a.onclick = this._legendSelected, i.onmouseover = a.onmouseover = this._dispatchHoverLink, i.hoverConnect = a.id, a.hoverConnect = i.id), this.shapeList.push(i), this.shapeList.push(a), "horizontal" === this.legendOption.orient ? y += b + 5 + m.getTextWidth(l, s) + k : g += f + k) : "horizontal" === this.legendOption.orient ? (y = this._itemGroupLocation.x, g += f + k) : ("right" === this.legendOption.x ? y -= this._itemGroupLocation.maxWidth + k : y += this._itemGroupLocation.maxWidth + k, g = this._itemGroupLocation.y);
                "horizontal" === this.legendOption.orient && "center" === this.legendOption.x && g != this._itemGroupLocation.y && this._mLineOptimize()
            },
            _getName: function (e) {
                return "undefined" != typeof e.name ? e.name : e
            },
            _getFormatterName: function (e) {
                var t, i = this.legendOption.formatter;
                return t = "function" == typeof i ? i.call(this.myChart, e) : "string" == typeof i ? i.replace("{name}", e) : e
            },
            _getFormatterNameFromData: function (e) {
                var t = this._getName(e);
                return this._getFormatterName(t)
            },
            _mLineOptimize: function () {
                for (var e = [], t = this._itemGroupLocation.x, i = 2, n = this.shapeList.length; n > i; i++) this.shapeList[i].style.x === t ? e.push((this._itemGroupLocation.width - (this.shapeList[i - 1].style.x + m.getTextWidth(this.shapeList[i - 1].style.text, this.shapeList[i - 1].style.textFont) - t)) / 2) : i === n - 1 && e.push((this._itemGroupLocation.width - (this.shapeList[i].style.x + m.getTextWidth(this.shapeList[i].style.text, this.shapeList[i].style.textFont) - t)) / 2);
                for (var a = -1, i = 1, n = this.shapeList.length; n > i; i++) this.shapeList[i].style.x === t && a++, 0 !== e[a] && (this.shapeList[i].style.x += e[a])
            },
            _buildBackground: function () {
                var e = this.reformCssArray(this.legendOption.padding);
                this.shapeList.push(new a({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable: !1,
                    style: {
                        x: this._itemGroupLocation.x - e[3],
                        y: this._itemGroupLocation.y - e[0],
                        width: this._itemGroupLocation.width + e[3] + e[1],
                        height: this._itemGroupLocation.height + e[0] + e[2],
                        brushType: 0 === this.legendOption.borderWidth ? "fill" : "both",
                        color: this.legendOption.backgroundColor,
                        strokeColor: this.legendOption.borderColor,
                        lineWidth: this.legendOption.borderWidth
                    }
                }))
            },
            _getItemGroupLocation: function () {
                var e = this.legendOption.data,
                    t = e.length,
                    i = this.legendOption.itemGap,
                    n = this.legendOption.itemWidth + 5,
                    a = this.legendOption.itemHeight,
                    o = this.legendOption.textStyle,
                    r = this.getFont(o),
                    s = 0,
                    l = 0,
                    V = this.reformCssArray(this.legendOption.padding),
                    U = this.zr.getWidth() - V[1] - V[3],
                    d = this.zr.getHeight() - V[0] - V[2],
                    p = 0,
                    c = 0;
                if ("horizontal" === this.legendOption.orient) {
                    l = a;
                    for (var u = 0; t > u; u++)
                        if ("" !== this._getName(e[u])) {
                            var y = m.getTextWidth(this._getFormatterNameFromData(e[u]), e[u].textStyle ? this.getFont(h.merge(e[u].textStyle || {}, o)) : r);
                            p + n + y + i > U ? (p -= i, s = Math.max(s, p), l += a + i, p = 0) : (p += n + y + i, s = Math.max(s, p - i))
                        } else p -= i, s = Math.max(s, p), l += a + i, p = 0
                } else {
                    for (var u = 0; t > u; u++) c = Math.max(c, m.getTextWidth(this._getFormatterNameFromData(e[u]), e[u].textStyle ? this.getFont(h.merge(e[u].textStyle || {}, o)) : r));
                    c += n, s = c;
                    for (var u = 0; t > u; u++) "" !== this._getName(e[u]) ? p + a + i > d ? (s += c + i, p -= i, l = Math.max(l, p), p = 0) : (p += a + i, l = Math.max(l, p - i)) : (s += c + i, p -= i, l = Math.max(l, p), p = 0)
                }
                U = this.zr.getWidth(), d = this.zr.getHeight();
                var g;
                switch (this.legendOption.x) {
                    case "center":
                        g = Math.floor((U - s) / 2);
                        break;
                    case "left":
                        g = V[3] + this.legendOption.borderWidth;
                        break;
                    case "right":
                        g = U - s - V[1] - V[3] - 2 * this.legendOption.borderWidth;
                        break;
                    default:
                        g = this.parsePercent(this.legendOption.x, U)
                }
                var b;
                switch (this.legendOption.y) {
                    case "top":
                        b = V[0] + this.legendOption.borderWidth;
                        break;
                    case "bottom":
                        b = d - l - V[0] - V[2] - 2 * this.legendOption.borderWidth;
                        break;
                    case "center":
                        b = Math.floor((d - l) / 2);
                        break;
                    default:
                        b = this.parsePercent(this.legendOption.y, d)
                }
                return {
                    x: g,
                    y: b,
                    width: s,
                    height: l,
                    maxWidth: c
                }
            },
            _getSomethingByName: function (e) {
                for (var t, i = this.option.series, n = 0, a = i.length; a > n; n++) {
                    if (i[n].name === e) return {
                        type: i[n].type,
                        series: i[n],
                        seriesIndex: n,
                        data: null,
                        dataIndex: -1
                    };
                    if (i[n].type === l.CHART_TYPE_PIE || i[n].type === l.CHART_TYPE_RADAR || i[n].type === l.CHART_TYPE_CHORD || i[n].type === l.CHART_TYPE_FORCE || i[n].type === l.CHART_TYPE_FUNNEL || i[n].type === l.CHART_TYPE_TREEMAP) {
                        t = i[n].categories || i[n].data || i[n].nodes;
                        for (var o = 0, r = t.length; r > o; o++)
                            if (t[o].name === e) return {
                                type: i[n].type,
                                series: i[n],
                                seriesIndex: n,
                                data: t[o],
                                dataIndex: o
                            }
                    }
                }
                return {
                    type: "bar",
                    series: null,
                    seriesIndex: -1,
                    data: null,
                    dataIndex: -1
                }
            },
            _getItemShapeByType: function (e, t, i, n, a, o, r) {
                var s, h = "#ccc" === a ? r : a,
                    m = {
                        zlevel: this.getZlevelBase(),
                        z: this.getZBase(),
                        style: {
                            iconType: "legendicon" + o,
                            x: e,
                            y: t,
                            width: i,
                            height: n,
                            color: a,
                            strokeColor: a,
                            lineWidth: 2
                        },
                        highlightStyle: {
                            color: h,
                            strokeColor: h,
                            lineWidth: 1
                        },
                        hoverable: this.legendOption.selectedMode,
                        clickable: this.legendOption.selectedMode
                    };
                if (o.match("image")) {
                    var s = o.replace(new RegExp("^image:\\/\\/"), "");
                    o = "image"
                }
                switch (o) {
                    case "line":
                        m.style.brushType = "stroke", m.highlightStyle.lineWidth = 3;
                        break;
                    case "radar":
                    case "venn":
                    case "tree":
                    case "treemap":
                    case "scatter":
                        m.highlightStyle.lineWidth = 3;
                        break;
                    case "k":
                        m.style.brushType = "both", m.highlightStyle.lineWidth = 3, m.highlightStyle.color = m.style.color = this.deepQuery([this.ecTheme, l], "k.itemStyle.normal.color") || "#fff", m.style.strokeColor = "#ccc" != a ? this.deepQuery([this.ecTheme, l], "k.itemStyle.normal.lineStyle.color") || "#ff3200" : a;
                        break;
                    case "image":
                        m.style.iconType = "image", m.style.image = s, "#ccc" === a && (m.style.opacity = .5)
                }
                return m
            },
            __legendSelected: function (e) {
                var t = e.target._name;
                if ("single" === this.legendOption.selectedMode)
                    for (var i in this._selectedMap) this._selectedMap[i] = !1;
                this._selectedMap[t] = !this._selectedMap[t], this.messageCenter.dispatch(l.EVENT.LEGEND_SELECTED, e.event, {
                    selected: this._selectedMap,
                    target: t
                }, this.myChart)
            },
            __dispatchHoverLink: function (e) {
                this.messageCenter.dispatch(l.EVENT.LEGEND_HOVERLINK, e.event, {
                    target: e.target._name
                }, this.myChart)
            },
            refresh: function (e) {
                if (e) {
                    this.option = e || this.option, this.option.legend = this.reformOption(this.option.legend), this.legendOption = this.option.legend;
                    var t, i, n, a, o = this.legendOption.data || [];
                    if (this.legendOption.selected)
                        for (var r in this.legendOption.selected) this._selectedMap[r] = "undefined" != typeof this._selectedMap[r] ? this._selectedMap[r] : this.legendOption.selected[r];
                    for (var s = 0, h = o.length; h > s; s++) t = this._getName(o[s]), "" !== t && (i = this._getSomethingByName(t), i.series ? (this._hasDataMap[t] = !0, a = !i.data || i.type !== l.CHART_TYPE_PIE && i.type !== l.CHART_TYPE_FORCE && i.type !== l.CHART_TYPE_FUNNEL ? [i.series] : [i.data, i.series], n = this.getItemStyleColor(this.deepQuery(a, "itemStyle.normal.color"), i.seriesIndex, i.dataIndex, i.data), n && i.type != l.CHART_TYPE_K && this.setColor(t, n), this._selectedMap[t] = null != this._selectedMap[t] ? this._selectedMap[t] : !0) : this._hasDataMap[t] = !1)
                }
                this.clear(), this._buildShape()
            },
            getRelatedAmount: function (e) {
                for (var t, i = 0, n = this.option.series, a = 0, o = n.length; o > a; a++)
                    if (n[a].name === e && i++, n[a].type === l.CHART_TYPE_PIE || n[a].type === l.CHART_TYPE_RADAR || n[a].type === l.CHART_TYPE_CHORD || n[a].type === l.CHART_TYPE_FORCE || n[a].type === l.CHART_TYPE_FUNNEL) {
                        t = n[a].type != l.CHART_TYPE_FORCE ? n[a].data : n[a].categories;
                        for (var r = 0, s = t.length; s > r; r++) t[r].name === e && "-" != t[r].value && i++
                    }
                return i
            },
            setColor: function (e, t) {
                this._colorMap[e] = t
            },
            getColor: function (e) {
                return this._colorMap[e] || (this._colorMap[e] = this.zr.getColor(this._colorIndex++)), this._colorMap[e]
            },
            hasColor: function (e) {
                return this._colorMap[e] ? this._colorMap[e] : !1
            },
            add: function (e, t) {
                for (var i = this.legendOption.data, n = 0, a = i.length; a > n; n++)
                    if (this._getName(i[n]) === e) return;
                this.legendOption.data.push(e), this.setColor(e, t), this._selectedMap[e] = !0, this._hasDataMap[e] = !0
            },
            del: function (e) {
                for (var t = this.legendOption.data, i = 0, n = t.length; n > i; i++)
                    if (this._getName(t[i]) === e) return this.legendOption.data.splice(i, 1)
            },
            getItemShape: function (e) {
                if (null != e)
                    for (var t, i = 0, n = this.shapeList.length; n > i; i++)
                        if (t = this.shapeList[i], t._name === e && "text" != t.type) return t
            },
            setItemShape: function (e, t) {
                for (var i, n = 0, a = this.shapeList.length; a > n; n++) i = this.shapeList[n], i._name === e && "text" != i.type && (this._selectedMap[e] || (t.style.color = "#ccc", t.style.strokeColor = "#ccc"), this.zr.modShape(i.id, t))
            },
            isSelected: function (e) {
                return "undefined" != typeof this._selectedMap[e] ? this._selectedMap[e] : !0
            },
            getSelectedMap: function () {
                return this._selectedMap
            },
            setSelected: function (e, t) {
                if ("single" === this.legendOption.selectedMode)
                    for (var i in this._selectedMap) this._selectedMap[i] = !1;
                this._selectedMap[e] = t, this.messageCenter.dispatch(l.EVENT.LEGEND_SELECTED, null, {
                    selected: this._selectedMap,
                    target: e
                }, this.myChart)
            },
            onlegendSelected: function (e, t) {
                var i = e.selected;
                for (var n in i) this._selectedMap[n] != i[n] && (t.needRefresh = !0), this._selectedMap[n] = i[n]
            }
        };
        var V = {
            line: function (e, t) {
                var i = t.height / 2;
                e.moveTo(t.x, t.y + i), e.lineTo(t.x + t.width, t.y + i)
            },
            pie: function (e, t) {
                var i = t.x,
                    n = t.y,
                    a = t.width,
                    r = t.height;
                o.prototype.buildPath(e, {
                    x: i + a / 2,
                    y: n + r + 2,
                    r: r,
                    r0: 6,
                    startAngle: 45,
                    endAngle: 135
                })
            },
            eventRiver: function (e, t) {
                var i = t.x,
                    n = t.y,
                    a = t.width,
                    o = t.height;
                e.moveTo(i, n + o), e.bezierCurveTo(i + a, n + o, i, n + 4, i + a, n + 4), e.lineTo(i + a, n), e.bezierCurveTo(i, n, i + a, n + o - 4, i, n + o - 4), e.lineTo(i, n + o)
            },
            k: function (e, t) {
                var i = t.x,
                    n = t.y,
                    a = t.width,
                    o = t.height;
                s.prototype.buildPath(e, {
                    x: i + a / 2,
                    y: [n + 1, n + 1, n + o - 6, n + o],
                    width: a - 6
                })
            },
            bar: function (e, t) {
                var i = t.x,
                    n = t.y + 1,
                    a = t.width,
                    o = t.height - 2,
                    r = 3;
                e.moveTo(i + r, n), e.lineTo(i + a - r, n), e.quadraticCurveTo(i + a, n, i + a, n + r), e.lineTo(i + a, n + o - r), e.quadraticCurveTo(i + a, n + o, i + a - r, n + o), e.lineTo(i + r, n + o), e.quadraticCurveTo(i, n + o, i, n + o - r), e.lineTo(i, n + r), e.quadraticCurveTo(i, n, i + r, n)
            },
            force: function (e, t) {
                r.prototype.iconLibrary.circle(e, t)
            },
            radar: function (e, t) {
                var i = 6,
                    n = t.x + t.width / 2,
                    a = t.y + t.height / 2,
                    o = t.height / 2,
                    r = 2 * Math.PI / i,
                    s = -Math.PI / 2,
                    l = n + o * Math.cos(s),
                    h = a + o * Math.sin(s);
                e.moveTo(l, h), s += r;
                for (var m = 0, V = i - 1; V > m; m++) e.lineTo(n + o * Math.cos(s), a + o * Math.sin(s)), s += r;
                e.lineTo(l, h)
            }
        };
        V.chord = V.pie, V.map = V.bar;
        for (var U in V) r.prototype.iconLibrary["legendicon" + U] = V[U];
        return h.inherits(t, i), e("../component").define("legend", t), t
    }), i("echarts/util/ecData", [], function () {
        function e(e, t, i, n, a, o, r, s) {
            var l;
            return "undefined" != typeof n && (l = null == n.value ? n : n.value), e._echartsData = {
                _series: t,
                _seriesIndex: i,
                _data: n,
                _dataIndex: a,
                _name: o,
                _value: l,
                _special: r,
                _special2: s
            }, e._echartsData
        }

        function t(e, t) {
            var i = e._echartsData;
            if (!t) return i;
            switch (t) {
                case "series":
                case "seriesIndex":
                case "data":
                case "dataIndex":
                case "name":
                case "value":
                case "special":
                case "special2":
                    return i && i["_" + t]
            }
            return null
        }

        function i(e, t, i) {
            switch (e._echartsData = e._echartsData || {}, t) {
                case "series":
                case "seriesIndex":
                case "data":
                case "dataIndex":
                case "name":
                case "value":
                case "special":
                case "special2":
                    e._echartsData["_" + t] = i
            }
        }

        function n(e, t) {
            t._echartsData = {
                _series: e._echartsData._series,
                _seriesIndex: e._echartsData._seriesIndex,
                _data: e._echartsData._data,
                _dataIndex: e._echartsData._dataIndex,
                _name: e._echartsData._name,
                _value: e._echartsData._value,
                _special: e._echartsData._special,
                _special2: e._echartsData._special2
            }
        }
        return {
            pack: e,
            set: i,
            get: t,
            clone: n
        }
    }), i("echarts/chart", [], function () {
        var e = {},
            t = {};
        return e.define = function (i, n) {
            return t[i] = n, e
        }, e.get = function (e) {
            return t[e]
        }, e
    }), i("zrender/tool/color", ["require", "../tool/util"], function (e) {
        function t(e) {
            D = e
        }

        function i() {
            D = N
        }

        function n(e, t) {
            return e = 0 | e, t = t || D, t[e % t.length]
        }

        function a(e) {
            B = e
        }

        function o() {
            H = B
        }

        function r() {
            return B
        }

        function s(e, t, i, n, a, o, r) {
            O || (O = P.getContext());
            for (var s = O.createRadialGradient(e, t, i, n, a, o), l = 0, h = r.length; h > l; l++) s.addColorStop(r[l][0], r[l][1]);
            return s.__nonRecursion = !0, s
        }

        function l(e, t, i, n, a) {
            O || (O = P.getContext());
            for (var o = O.createLinearGradient(e, t, i, n), r = 0, s = a.length; s > r; r++) o.addColorStop(a[r][0], a[r][1]);
            return o.__nonRecursion = !0, o
        }

        function h(e, t, i) {
            e = p(e), t = p(t), e = I(e), t = I(t);
            for (var n = [], a = (t[0] - e[0]) / i, o = (t[1] - e[1]) / i, r = (t[2] - e[2]) / i, s = (t[3] - e[3]) / i, l = 0, h = e[0], m = e[1], U = e[2], d = e[3]; i > l; l++) n[l] = V([S(Math.floor(h), [0, 255]), S(Math.floor(m), [0, 255]), S(Math.floor(U), [0, 255]), d.toFixed(4) - 0], "rgba"), h += a, m += o, U += r, d += s;
            return h = t[0], m = t[1], U = t[2], d = t[3], n[l] = V([h, m, U, d], "rgba"), n
        }

        function m(e, t) {
            var i = [],
                n = e.length;
            if (void 0 === t && (t = 20), 1 === n) i = h(e[0], e[0], t);
            else if (n > 1)
                for (var a = 0, o = n - 1; o > a; a++) {
                    var r = h(e[a], e[a + 1], t);
                    o - 1 > a && r.pop(), i = i.concat(r)
                }
            return i
        }

        function V(e, t) {
            if (t = t || "rgb", e && (3 === e.length || 4 === e.length)) {
                if (e = C(e, function (e) {
                    return e > 1 ? Math.ceil(e) : e
                }), t.indexOf("hex") > -1) return "#" + ((1 << 24) + (e[0] << 16) + (e[1] << 8) + +e[2]).toString(16).slice(1);
                if (t.indexOf("hs") > -1) {
                    var i = C(e.slice(1, 3), function (e) {
                        return e + "%"
                    });
                    e[1] = i[0], e[2] = i[1]
                }
                return t.indexOf("a") > -1 ? (3 === e.length && e.push(1), e[3] = S(e[3], [0, 1]), t + "(" + e.slice(0, 4).join(",") + ")") : t + "(" + e.slice(0, 3).join(",") + ")"
            }
        }

        function U(e) {
            e = L(e), e.indexOf("rgba") < 0 && (e = p(e));
            var t = [],
                i = 0;
            return e.replace(/[\d.]+/g, function (e) {
                e = 3 > i ? 0 | e : +e, t[i++] = e
            }), t
        }

        function d(e, t) {
            if (!E(e)) return e;
            var i = I(e),
                n = i[3];
            return "undefined" == typeof n && (n = 1), e.indexOf("hsb") > -1 ? i = F(i) : e.indexOf("hsl") > -1 && (i = T(i)), t.indexOf("hsb") > -1 || t.indexOf("hsv") > -1 ? i = A(i) : t.indexOf("hsl") > -1 && (i = M(i)), i[3] = n, V(i, t)
        }

        function p(e) {
            return d(e, "rgba")
        }

        function c(e) {
            return d(e, "rgb")
        }

        function u(e) {
            return d(e, "hex")
        }

        function y(e) {
            return d(e, "hsva")
        }

        function g(e) {
            return d(e, "hsv")
        }

        function b(e) {
            return d(e, "hsba")
        }

        function f(e) {
            return d(e, "hsb")
        }

        function k(e) {
            return d(e, "hsla")
        }

        function x(e) {
            return d(e, "hsl")
        }

        function _(e) {
            for (var t in G)
                if (u(G[t]) === u(e)) return t;
            return null
        }

        function L(e) {
            return String(e).replace(/\s+/g, "")
        }

        function W(e) {
            if (G[e] && (e = G[e]), e = L(e), e = e.replace(/hsv/i, "hsb"), /^#[\da-f]{3}$/i.test(e)) {
                e = parseInt(e.slice(1), 16);
                var t = (3840 & e) << 8,
                    i = (240 & e) << 4,
                    n = 15 & e;
                e = "#" + ((1 << 24) + (t << 4) + t + (i << 4) + i + (n << 4) + n).toString(16).slice(1)
            }
            return e
        }

        function X(e, t) {
            if (!E(e)) return e;
            var i = t > 0 ? 1 : -1;
            "undefined" == typeof t && (t = 0), t = Math.abs(t) > 1 ? 1 : Math.abs(t), e = c(e);
            for (var n = I(e), a = 0; 3 > a; a++) n[a] = 1 === i ? n[a] * (1 - t) | 0 : (255 - n[a]) * t + n[a] | 0;
            return "rgb(" + n.join(",") + ")"
        }

        function v(e) {
            if (!E(e)) return e;
            var t = I(p(e));
            return t = C(t, function (e) {
                return 255 - e
            }), V(t, "rgb")
        }

        function w(e, t, i) {
            if (!E(e) || !E(t)) return e;
            "undefined" == typeof i && (i = .5), i = 1 - S(i, [0, 1]);
            for (var n = 2 * i - 1, a = I(p(e)), o = I(p(t)), r = a[3] - o[3], s = ((n * r === -1 ? n : (n + r) / (1 + n * r)) + 1) / 2, l = 1 - s, h = [], m = 0; 3 > m; m++) h[m] = a[m] * s + o[m] * l;
            var U = a[3] * i + o[3] * (1 - i);
            return U = Math.max(0, Math.min(1, U)), 1 === a[3] && 1 === o[3] ? V(h, "rgb") : (h[3] = U, V(h, "rgba"))
        }

        function K() {
            return "#" + (Math.random().toString(16) + "0000").slice(2, 8)
        }

        function I(e) {
            e = W(e);
            var t = e.match(R);
            if (null === t) throw new Error("The color format error");
            var i, n, a, o = [];
            if (t[2]) i = t[2].replace("#", "").split(""), a = [i[0] + i[1], i[2] + i[3], i[4] + i[5]], o = C(a, function (e) {
                return S(parseInt(e, 16), [0, 255])
            });
            else if (t[4]) {
                var r = t[4].split(",");
                n = r[3], a = r.slice(0, 3), o = C(a, function (e) {
                    return e = Math.floor(e.indexOf("%") > 0 ? 2.55 * parseInt(e, 0) : e), S(e, [0, 255])
                }), "undefined" != typeof n && o.push(S(parseFloat(n), [0, 1]))
            } else if (t[5] || t[6]) {
                var s = (t[5] || t[6]).split(","),
                    l = parseInt(s[0], 0) / 360,
                    h = s[1],
                    m = s[2];
                n = s[3], o = C([h, m], function (e) {
                    return S(parseFloat(e) / 100, [0, 1])
                }), o.unshift(l), "undefined" != typeof n && o.push(S(parseFloat(n), [0, 1]))
            }
            return o
        }

        function J(e, t) {
            if (!E(e)) return e;
            null === t && (t = 1);
            var i = I(p(e));
            return i[3] = S(Number(t).toFixed(4), [0, 1]), V(i, "rgba")
        }

        function C(e, t) {
            if ("function" != typeof t) throw new TypeError;
            for (var i = e ? e.length : 0, n = 0; i > n; n++) e[n] = t(e[n]);
            return e
        }

        function S(e, t) {
            return e <= t[0] ? e = t[0] : e >= t[1] && (e = t[1]), e
        }

        function E(e) {
            return e instanceof Array || "string" == typeof e
        }

        function F(e) {
            var t, i, n, a = e[0],
                o = e[1],
                r = e[2];
            if (0 === o) t = 255 * r, i = 255 * r, n = 255 * r;
            else {
                var s = 6 * a;
                6 === s && (s = 0);
                var l = 0 | s,
                    h = r * (1 - o),
                    m = r * (1 - o * (s - l)),
                    V = r * (1 - o * (1 - (s - l))),
                    U = 0,
                    d = 0,
                    p = 0;
                0 === l ? (U = r, d = V, p = h) : 1 === l ? (U = m, d = r, p = h) : 2 === l ? (U = h, d = r, p = V) : 3 === l ? (U = h, d = m, p = r) : 4 === l ? (U = V, d = h, p = r) : (U = r, d = h, p = m), t = 255 * U, i = 255 * d, n = 255 * p
            }
            return [t, i, n]
        }

        function T(e) {
            var t, i, n, a = e[0],
                o = e[1],
                r = e[2];
            if (0 === o) t = 255 * r, i = 255 * r, n = 255 * r;
            else {
                var s;
                s = .5 > r ? r * (1 + o) : r + o - o * r;
                var l = 2 * r - s;
                t = 255 * z(l, s, a + 1 / 3), i = 255 * z(l, s, a), n = 255 * z(l, s, a - 1 / 3)
            }
            return [t, i, n]
        }

        function z(e, t, i) {
            return 0 > i && (i += 1), i > 1 && (i -= 1), 1 > 6 * i ? e + 6 * (t - e) * i : 1 > 2 * i ? t : 2 > 3 * i ? e + (t - e) * (2 / 3 - i) * 6 : e
        }

        function A(e) {
            var t, i, n = e[0] / 255,
                a = e[1] / 255,
                o = e[2] / 255,
                r = Math.min(n, a, o),
                s = Math.max(n, a, o),
                l = s - r,
                h = s;
            if (0 === l) t = 0, i = 0;
            else {
                i = l / s;
                var m = ((s - n) / 6 + l / 2) / l,
                    V = ((s - a) / 6 + l / 2) / l,
                    U = ((s - o) / 6 + l / 2) / l;
                n === s ? t = U - V : a === s ? t = 1 / 3 + m - U : o === s && (t = 2 / 3 + V - m), 0 > t && (t += 1), t > 1 && (t -= 1)
            }
            return t = 360 * t, i = 100 * i, h = 100 * h, [t, i, h]
        }

        function M(e) {
            var t, i, n = e[0] / 255,
                a = e[1] / 255,
                o = e[2] / 255,
                r = Math.min(n, a, o),
                s = Math.max(n, a, o),
                l = s - r,
                h = (s + r) / 2;
            if (0 === l) t = 0, i = 0;
            else {
                i = .5 > h ? l / (s + r) : l / (2 - s - r);
                var m = ((s - n) / 6 + l / 2) / l,
                    V = ((s - a) / 6 + l / 2) / l,
                    U = ((s - o) / 6 + l / 2) / l;
                n === s ? t = U - V : a === s ? t = 1 / 3 + m - U : o === s && (t = 2 / 3 + V - m), 0 > t && (t += 1), t > 1 && (t -= 1)
            }
            return t = 360 * t, i = 100 * i, h = 100 * h, [t, i, h]
        }
        var O, P = e("../tool/util"),
            D = ["#ff9277", " #dddd00", " #ffc877", " #bbe3ff", " #d5ffbb", "#bbbbff", " #ddb000", " #b0dd00", " #e2bbff", " #ffbbe3", "#ff7777", " #ff9900", " #83dd00", " #77e3ff", " #778fff", "#c877ff", " #ff77ab", " #ff6600", " #aa8800", " #77c7ff", "#ad77ff", " #ff77ff", " #dd0083", " #777700", " #00aa00", "#0088aa", " #8400dd", " #aa0088", " #dd0000", " #772e00"],
            N = D,
            B = "rgba(255,255,0,0.5)",
            H = B,
            R = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i,
            G = {
                aliceblue: "#f0f8ff",
                antiquewhite: "#faebd7",
                aqua: "#0ff",
                aquamarine: "#7fffd4",
                azure: "#f0ffff",
                beige: "#f5f5dc",
                bisque: "#ffe4c4",
                black: "#000",
                blanchedalmond: "#ffebcd",
                blue: "#00f",
                blueviolet: "#8a2be2",
                brown: "#a52a2a",
                burlywood: "#deb887",
                cadetblue: "#5f9ea0",
                chartreuse: "#7fff00",
                chocolate: "#d2691e",
                coral: "#ff7f50",
                cornflowerblue: "#6495ed",
                cornsilk: "#fff8dc",
                crimson: "#dc143c",
                cyan: "#0ff",
                darkblue: "#00008b",
                darkcyan: "#008b8b",
                darkgoldenrod: "#b8860b",
                darkgray: "#a9a9a9",
                darkgrey: "#a9a9a9",
                darkgreen: "#006400",
                darkkhaki: "#bdb76b",
                darkmagenta: "#8b008b",
                darkolivegreen: "#556b2f",
                darkorange: "#ff8c00",
                darkorchid: "#9932cc",
                darkred: "#8b0000",
                darksalmon: "#e9967a",
                darkseagreen: "#8fbc8f",
                darkslateblue: "#483d8b",
                darkslategray: "#2f4f4f",
                darkslategrey: "#2f4f4f",
                darkturquoise: "#00ced1",
                darkviolet: "#9400d3",
                deeppink: "#ff1493",
                deepskyblue: "#00bfff",
                dimgray: "#696969",
                dimgrey: "#696969",
                dodgerblue: "#1e90ff",
                firebrick: "#b22222",
                floralwhite: "#fffaf0",
                forestgreen: "#228b22",
                fuchsia: "#f0f",
                gainsboro: "#dcdcdc",
                ghostwhite: "#f8f8ff",
                gold: "#ffd700",
                goldenrod: "#daa520",
                gray: "#808080",
                grey: "#808080",
                green: "#008000",
                greenyellow: "#adff2f",
                honeydew: "#f0fff0",
                hotpink: "#ff69b4",
                indianred: "#cd5c5c",
                indigo: "#4b0082",
                ivory: "#fffff0",
                khaki: "#f0e68c",
                lavender: "#e6e6fa",
                lavenderblush: "#fff0f5",
                lawngreen: "#7cfc00",
                lemonchiffon: "#fffacd",
                lightblue: "#add8e6",
                lightcoral: "#f08080",
                lightcyan: "#e0ffff",
                lightgoldenrodyellow: "#fafad2",
                lightgray: "#d3d3d3",
                lightgrey: "#d3d3d3",
                lightgreen: "#90ee90",
                lightpink: "#ffb6c1",
                lightsalmon: "#ffa07a",
                lightseagreen: "#20b2aa",
                lightskyblue: "#87cefa",
                lightslategray: "#789",
                lightslategrey: "#789",
                lightsteelblue: "#b0c4de",
                lightyellow: "#ffffe0",
                lime: "#0f0",
                limegreen: "#32cd32",
                linen: "#faf0e6",
                magenta: "#f0f",
                maroon: "#800000",
                mediumaquamarine: "#66cdaa",
                mediumblue: "#0000cd",
                mediumorchid: "#ba55d3",
                mediumpurple: "#9370d8",
                mediumseagreen: "#3cb371",
                mediumslateblue: "#7b68ee",
                mediumspringgreen: "#00fa9a",
                mediumturquoise: "#48d1cc",
                mediumvioletred: "#c71585",
                midnightblue: "#191970",
                mintcream: "#f5fffa",
                mistyrose: "#ffe4e1",
                moccasin: "#ffe4b5",
                navajowhite: "#ffdead",
                navy: "#000080",
                oldlace: "#fdf5e6",
                olive: "#808000",
                olivedrab: "#6b8e23",
                orange: "#ffa500",
                orangered: "#ff4500",
                orchid: "#da70d6",
                palegoldenrod: "#eee8aa",
                palegreen: "#98fb98",
                paleturquoise: "#afeeee",
                palevioletred: "#d87093",
                papayawhip: "#ffefd5",
                peachpuff: "#ffdab9",
                peru: "#cd853f",
                pink: "#ffc0cb",
                plum: "#dda0dd",
                powderblue: "#b0e0e6",
                purple: "#800080",
                red: "#f00",
                rosybrown: "#bc8f8f",
                royalblue: "#4169e1",
                saddlebrown: "#8b4513",
                salmon: "#fa8072",
                sandybrown: "#f4a460",
                seagreen: "#2e8b57",
                seashell: "#fff5ee",
                sienna: "#a0522d",
                silver: "#c0c0c0",
                skyblue: "#87ceeb",
                slateblue: "#6a5acd",
                slategray: "#708090",
                slategrey: "#708090",
                snow: "#fffafa",
                springgreen: "#00ff7f",
                steelblue: "#4682b4",
                tan: "#d2b48c",
                teal: "#008080",
                thistle: "#d8bfd8",
                tomato: "#ff6347",
                turquoise: "#40e0d0",
                violet: "#ee82ee",
                wheat: "#f5deb3",
                white: "#fff",
                whitesmoke: "#f5f5f5",
                yellow: "#ff0",
                yellowgreen: "#9acd32"
            };
        return {
            customPalette: t,
            resetPalette: i,
            getColor: n,
            getHighlightColor: r,
            customHighlight: a,
            resetHighlight: o,
            getRadialGradient: s,
            getLinearGradient: l,
            getGradientColors: m,
            getStepColors: h,
            reverse: v,
            mix: w,
            lift: X,
            trim: L,
            random: K,
            toRGB: c,
            toRGBA: p,
            toHex: u,
            toHSL: x,
            toHSLA: k,
            toHSB: f,
            toHSBA: b,
            toHSV: g,
            toHSVA: y,
            toName: _,
            toColor: V,
            toArray: U,
            alpha: J,
            getData: I
        }
    }), i("echarts/component/timeline", ["require", "./base", "zrender/shape/Rectangle", "../util/shape/Icon", "../util/shape/Chain", "../config", "zrender/tool/util", "zrender/tool/area", "zrender/tool/event", "../component"], function (e) {
        function t(e, t, i, a, o) {
            n.call(this, e, t, i, a, o);
            var r = this;
            if (r._onclick = function (e) {
                return r.__onclick(e)
            }, r._ondrift = function (e, t) {
                return r.__ondrift(this, e, t)
            }, r._ondragend = function () {
                return r.__ondragend()
            }, r._setCurrentOption = function () {
                var e = r.timelineOption;
                r.currentIndex %= e.data.length;
                var t = r.options[r.currentIndex] || {};
                r.myChart._setOption(t, e.notMerge, !0), r.messageCenter.dispatch(s.EVENT.TIMELINE_CHANGED, null, {
                    currentIndex: r.currentIndex,
                    data: null != e.data[r.currentIndex].name ? e.data[r.currentIndex].name : e.data[r.currentIndex]
                }, r.myChart)
            }, r._onFrame = function () {
                r._setCurrentOption(), r._syncHandleShape(), r.timelineOption.autoPlay && (r.playTicket = setTimeout(function () {
                    return r.currentIndex += 1, !r.timelineOption.loop && r.currentIndex >= r.timelineOption.data.length ? (r.currentIndex = r.timelineOption.data.length - 1, void r.stop()) : void r._onFrame()
                }, r.timelineOption.playInterval))
            }, this.setTheme(!1), this.options = this.option.options, this.currentIndex = this.timelineOption.currentIndex % this.timelineOption.data.length, this.timelineOption.notMerge || 0 === this.currentIndex || (this.options[this.currentIndex] = l.merge(this.options[this.currentIndex], this.options[0])), this.timelineOption.show && (this._buildShape(), this._syncHandleShape()), this._setCurrentOption(), this.timelineOption.autoPlay) {
                var r = this;
                this.playTicket = setTimeout(function () {
                    r.play()
                }, null != this.ecTheme.animationDuration ? this.ecTheme.animationDuration : s.animationDuration)
            }
        }

        function i(e, t) {
            var i = 2,
                n = t.x + i,
                a = t.y + i + 2,
                r = t.width - i,
                s = t.height - i,
                l = t.symbol;
            if ("last" === l) e.moveTo(n + r - 2, a + s / 3), e.lineTo(n + r - 2, a), e.lineTo(n + 2, a + s / 2), e.lineTo(n + r - 2, a + s), e.lineTo(n + r - 2, a + s / 3 * 2), e.moveTo(n, a), e.lineTo(n, a);
            else if ("next" === l) e.moveTo(n + 2, a + s / 3), e.lineTo(n + 2, a), e.lineTo(n + r - 2, a + s / 2), e.lineTo(n + 2, a + s), e.lineTo(n + 2, a + s / 3 * 2), e.moveTo(n, a), e.lineTo(n, a);
            else if ("play" === l)
                if ("stop" === t.status) e.moveTo(n + 2, a), e.lineTo(n + r - 2, a + s / 2), e.lineTo(n + 2, a + s), e.lineTo(n + 2, a);
                else {
                    var h = "both" === t.brushType ? 2 : 3;
                    e.rect(n + 2, a, h, s), e.rect(n + r - h - 2, a, h, s)
                }
            else if (l.match("image")) {
                var m = "";
                m = l.replace(new RegExp("^image:\\/\\/"), ""), l = o.prototype.iconLibrary.image, l(e, {
                    x: n,
                    y: a,
                    width: r,
                    height: s,
                    image: m
                })
            }
        }
        var n = e("./base"),
            a = e("zrender/shape/Rectangle"),
            o = e("../util/shape/Icon"),
            r = e("../util/shape/Chain"),
            s = e("../config");
        s.timeline = {
            zlevel: 0,
            z: 4,
            show: !0,
            type: "time",
            notMerge: !1,
            realtime: !0,
            x: 80,
            x2: 80,
            y2: 0,
            height: 50,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "#ccc",
            borderWidth: 0,
            padding: 5,
            controlPosition: "left",
            autoPlay: !1,
            loop: !0,
            playInterval: 2e3,
            lineStyle: {
                width: 1,
                color: "#666",
                type: "dashed"
            },
            label: {
                show: !0,
                interval: "auto",
                rotate: 0,
                textStyle: {
                    color: "#333"
                }
            },
            checkpointStyle: {
                symbol: "auto",
                symbolSize: "auto",
                color: "auto",
                borderColor: "auto",
                borderWidth: "auto",
                label: {
                    show: !1,
                    textStyle: {
                        color: "auto"
                    }
                }
            },
            controlStyle: {
                itemSize: 15,
                itemGap: 5,
                normal: {
                    color: "#333"
                },
                emphasis: {
                    color: "#1e90ff"
                }
            },
            symbol: "emptyDiamond",
            symbolSize: 4,
            currentIndex: 0
        };
        var l = e("zrender/tool/util"),
            h = e("zrender/tool/area"),
            m = e("zrender/tool/event");
        return t.prototype = {
            type: s.COMPONENT_TYPE_TIMELINE,
            _buildShape: function () {
                if (this._location = this._getLocation(), this._buildBackground(), this._buildControl(), this._chainPoint = this._getChainPoint(), this.timelineOption.label.show)
                    for (var e = this._getInterval(), t = 0, i = this._chainPoint.length; i > t; t += e) this._chainPoint[t].showLabel = !0;
                this._buildChain(), this._buildHandle();
                for (var t = 0, n = this.shapeList.length; n > t; t++) this.zr.addShape(this.shapeList[t])
            },
            _getLocation: function () {
                var e, t = this.timelineOption,
                    i = this.reformCssArray(this.timelineOption.padding),
                    n = this.zr.getWidth(),
                    a = this.parsePercent(t.x, n),
                    o = this.parsePercent(t.x2, n);
                null == t.width ? (e = n - a - o, o = n - o) : (e = this.parsePercent(t.width, n), o = a + e);
                var r, s, l = this.zr.getHeight(),
                    h = this.parsePercent(t.height, l);
                return null != t.y ? (r = this.parsePercent(t.y, l), s = r + h) : (s = l - this.parsePercent(t.y2, l), r = s - h), {
                    x: a + i[3],
                    y: r + i[0],
                    x2: o - i[1],
                    y2: s - i[2],
                    width: e - i[1] - i[3],
                    height: h - i[0] - i[2]
                }
            },
            _getReformedLabel: function (e) {
                var t = this.timelineOption,
                    i = null != t.data[e].name ? t.data[e].name : t.data[e],
                    n = t.data[e].formatter || t.label.formatter;
                return n && ("function" == typeof n ? i = n.call(this.myChart, i) : "string" == typeof n && (i = n.replace("{value}", i))), i
            },
            _getInterval: function () {
                var e = this._chainPoint,
                    t = this.timelineOption,
                    i = t.label.interval;
                if ("auto" === i) {
                    var n = t.label.textStyle.fontSize,
                        a = t.data,
                        o = t.data.length;
                    if (o > 3) {
                        var r, s, l = !1;
                        for (i = 0; !l && o > i;) {
                            i++, l = !0;
                            for (var m = i; o > m; m += i) {
                                if (r = e[m].x - e[m - i].x, 0 !== t.label.rotate) s = n;
                                else if (a[m].textStyle) s = h.getTextWidth(e[m].name, e[m].textFont);
                                else {
                                    var V = e[m].name + "",
                                        U = (V.match(/\w/g) || "").length,
                                        d = V.length - U;
                                    s = U * n * 2 / 3 + d * n
                                }
                                if (s > r) {
                                    l = !1;
                                    break
                                }
                            }
                        }
                    } else i = 1
                } else i = i - 0 + 1;
                return i
            },
            _getChainPoint: function () {
                function e(e) {
                    return null != h[e].name ? h[e].name : h[e] + ""
                }
                var t, i = this.timelineOption,
                    n = i.symbol.toLowerCase(),
                    a = i.symbolSize,
                    o = i.label.rotate,
                    r = i.label.textStyle,
                    s = this.getFont(r),
                    h = i.data,
                    m = this._location.x,
                    V = this._location.y + this._location.height / 4 * 3,
                    U = this._location.x2 - this._location.x,
                    d = h.length,
                    p = [];
                if (d > 1) {
                    var c = U / d;
                    if (c = c > 50 ? 50 : 20 > c ? 5 : c, U -= 2 * c, "number" === i.type)
                        for (var u = 0; d > u; u++) p.push(m + c + U / (d - 1) * u);
                    else {
                        p[0] = new Date(e(0).replace(/-/g, "/")), p[d - 1] = new Date(e(d - 1).replace(/-/g, "/")) - p[0];
                        for (var u = 1; d > u; u++) p[u] = m + c + U * (new Date(e(u).replace(/-/g, "/")) - p[0]) / p[d - 1];
                        p[0] = m + c
                    }
                } else p.push(m + U / 2);
                for (var y, g, b, f, k, x = [], u = 0; d > u; u++) m = p[u], y = h[u].symbol && h[u].symbol.toLowerCase() || n, y.match("empty") ? (y = y.replace("empty", ""), b = !0) : b = !1, y.match("star") && (g = y.replace("star", "") - 0 || 5, y = "star"), t = h[u].textStyle ? l.merge(h[u].textStyle || {}, r) : r, f = t.align || "center", o ? (f = o > 0 ? "right" : "left", k = [o * Math.PI / 180, m, V - 5]) : k = !1, x.push({
                    x: m,
                    n: g,
                    isEmpty: b,
                    symbol: y,
                    symbolSize: h[u].symbolSize || a,
                    color: h[u].color,
                    borderColor: h[u].borderColor,
                    borderWidth: h[u].borderWidth,
                    name: this._getReformedLabel(u),
                    textColor: t.color,
                    textAlign: f,
                    textBaseline: t.baseline || "middle",
                    textX: m,
                    textY: V - (o ? 5 : 0),
                    textFont: h[u].textStyle ? this.getFont(t) : s,
                    rotation: k,
                    showLabel: !1
                });
                return x
            },
            _buildBackground: function () {
                var e = this.timelineOption,
                    t = this.reformCssArray(this.timelineOption.padding),
                    i = this._location.width,
                    n = this._location.height;
                (0 !== e.borderWidth || "rgba(0,0,0,0)" != e.backgroundColor.replace(/\s/g, "")) && this.shapeList.push(new a({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable: !1,
                    style: {
                        x: this._location.x - t[3],
                        y: this._location.y - t[0],
                        width: i + t[1] + t[3],
                        height: n + t[0] + t[2],
                        brushType: 0 === e.borderWidth ? "fill" : "both",
                        color: e.backgroundColor,
                        strokeColor: e.borderColor,
                        lineWidth: e.borderWidth
                    }
                }))
            },
            _buildControl: function () {
                var e = this,
                    t = this.timelineOption,
                    i = t.lineStyle,
                    n = t.controlStyle;
                if ("none" !== t.controlPosition) {
                    var a, r = n.itemSize,
                        s = n.itemGap;
                    "left" === t.controlPosition ? (a = this._location.x, this._location.x += 3 * (r + s)) : (a = this._location.x2 - (3 * (r + s) - s), this._location.x2 -= 3 * (r + s));
                    var h = this._location.y,
                        m = {
                            zlevel: this.getZlevelBase(),
                            z: this.getZBase() + 1,
                            style: {
                                iconType: "timelineControl",
                                symbol: "last",
                                x: a,
                                y: h,
                                width: r,
                                height: r,
                                brushType: "stroke",
                                color: n.normal.color,
                                strokeColor: n.normal.color,
                                lineWidth: i.width
                            },
                            highlightStyle: {
                                color: n.emphasis.color,
                                strokeColor: n.emphasis.color,
                                lineWidth: i.width + 1
                            },
                            clickable: !0
                        };
                    this._ctrLastShape = new o(m), this._ctrLastShape.onclick = function () {
                        e.last()
                    }, this.shapeList.push(this._ctrLastShape), a += r + s, this._ctrPlayShape = new o(l.clone(m)), this._ctrPlayShape.style.brushType = "fill", this._ctrPlayShape.style.symbol = "play", this._ctrPlayShape.style.status = this.timelineOption.autoPlay ? "playing" : "stop", this._ctrPlayShape.style.x = a, this._ctrPlayShape.onclick = function () {
                        "stop" === e._ctrPlayShape.style.status ? e.play() : e.stop()
                    }, this.shapeList.push(this._ctrPlayShape), a += r + s, this._ctrNextShape = new o(l.clone(m)), this._ctrNextShape.style.symbol = "next", this._ctrNextShape.style.x = a, this._ctrNextShape.onclick = function () {
                        e.next()
                    }, this.shapeList.push(this._ctrNextShape)
                }
            },
            _buildChain: function () {
                var e = this.timelineOption,
                    t = e.lineStyle;
                this._timelineShae = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: this._location.x,
                        y: this.subPixelOptimize(this._location.y, t.width),
                        width: this._location.x2 - this._location.x,
                        height: this._location.height,
                        chainPoint: this._chainPoint,
                        brushType: "both",
                        strokeColor: t.color,
                        lineWidth: t.width,
                        lineType: t.type
                    },
                    hoverable: !1,
                    clickable: !0,
                    onclick: this._onclick
                }, this._timelineShae = new r(this._timelineShae), this.shapeList.push(this._timelineShae)
            },
            _buildHandle: function () {
                var e = this._chainPoint[this.currentIndex],
                    t = e.symbolSize + 1;
                t = 5 > t ? 5 : t, this._handleShape = {
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase() + 1,
                    hoverable: !1,
                    draggable: !0,
                    style: {
                        iconType: "diamond",
                        n: e.n,
                        x: e.x - t,
                        y: this._location.y + this._location.height / 4 - t,
                        width: 2 * t,
                        height: 2 * t,
                        brushType: "both",
                        textPosition: "specific",
                        textX: e.x,
                        textY: this._location.y - this._location.height / 4,
                        textAlign: "center",
                        textBaseline: "middle"
                    },
                    highlightStyle: {},
                    ondrift: this._ondrift,
                    ondragend: this._ondragend
                }, this._handleShape = new o(this._handleShape), this.shapeList.push(this._handleShape)
            },
            _syncHandleShape: function () {
                if (this.timelineOption.show) {
                    var e = this.timelineOption,
                        t = e.checkpointStyle,
                        i = this._chainPoint[this.currentIndex];
                    this._handleShape.style.text = t.label.show ? i.name : "", this._handleShape.style.textFont = i.textFont, this._handleShape.style.n = i.n, "auto" === t.symbol ? this._handleShape.style.iconType = "none" != i.symbol ? i.symbol : "diamond" : (this._handleShape.style.iconType = t.symbol, t.symbol.match("star") && (this._handleShape.style.n = t.symbol.replace("star", "") - 0 || 5, this._handleShape.style.iconType = "star"));
                    var n;
                    "auto" === t.symbolSize ? (n = i.symbolSize + 2, n = 5 > n ? 5 : n) : n = t.symbolSize - 0, this._handleShape.style.color = "auto" === t.color ? i.color ? i.color : e.controlStyle.emphasis.color : t.color, this._handleShape.style.textColor = "auto" === t.label.textStyle.color ? this._handleShape.style.color : t.label.textStyle.color, this._handleShape.highlightStyle.strokeColor = this._handleShape.style.strokeColor = "auto" === t.borderColor ? i.borderColor ? i.borderColor : "#fff" : t.borderColor, this._handleShape.style.lineWidth = "auto" === t.borderWidth ? i.borderWidth ? i.borderWidth : 0 : t.borderWidth - 0, this._handleShape.highlightStyle.lineWidth = this._handleShape.style.lineWidth + 1, this.zr.animate(this._handleShape.id, "style").when(500, {
                        x: i.x - n,
                        textX: i.x,
                        y: this._location.y + this._location.height / 4 - n,
                        width: 2 * n,
                        height: 2 * n
                    }).start("ExponentialOut")
                }
            },
            _findChainIndex: function (e) {
                var t = this._chainPoint,
                    i = t.length;
                if (e <= t[0].x) return 0;
                if (e >= t[i - 1].x) return i - 1;
                for (var n = 0; i - 1 > n; n++)
                    if (e >= t[n].x && e <= t[n + 1].x) return Math.abs(e - t[n].x) < Math.abs(e - t[n + 1].x) ? n : n + 1
            },
            __onclick: function (e) {
                var t = m.getX(e.event),
                    i = this._findChainIndex(t);
                return i === this.currentIndex ? !0 : (this.currentIndex = i, this.timelineOption.autoPlay && this.stop(), clearTimeout(this.playTicket), void this._onFrame())
            },
            __ondrift: function (e, t) {
                this.timelineOption.autoPlay && this.stop();
                var i, n = this._chainPoint,
                    a = n.length;
                e.style.x + t <= n[0].x - n[0].symbolSize ? (e.style.x = n[0].x - n[0].symbolSize, i = 0) : e.style.x + t >= n[a - 1].x - n[a - 1].symbolSize ? (e.style.x = n[a - 1].x - n[a - 1].symbolSize, i = a - 1) : (e.style.x += t, i = this._findChainIndex(e.style.x));
                var o = n[i],
                    r = o.symbolSize + 2;
                if (e.style.iconType = o.symbol, e.style.n = o.n, e.style.textX = e.style.x + r / 2, e.style.y = this._location.y + this._location.height / 4 - r, e.style.width = 2 * r, e.style.height = 2 * r, e.style.text = o.name, i === this.currentIndex) return !0;
                if (this.currentIndex = i, this.timelineOption.realtime) {
                    clearTimeout(this.playTicket);
                    var s = this;
                    this.playTicket = setTimeout(function () {
                        s._setCurrentOption()
                    }, 200)
                }
                return !0
            },
            __ondragend: function () {
                this.isDragend = !0
            },
            ondragend: function (e, t) {
                this.isDragend && e.target && (!this.timelineOption.realtime && this._setCurrentOption(), t.dragOut = !0, t.dragIn = !0, t.needRefresh = !1, this.isDragend = !1, this._syncHandleShape())
            },
            last: function () {
                return this.timelineOption.autoPlay && this.stop(), this.currentIndex -= 1, this.currentIndex < 0 && (this.currentIndex = this.timelineOption.data.length - 1), this._onFrame(), this.currentIndex
            },
            next: function () {
                return this.timelineOption.autoPlay && this.stop(), this.currentIndex += 1, this.currentIndex >= this.timelineOption.data.length && (this.currentIndex = 0), this._onFrame(), this.currentIndex
            },
            play: function (e, t) {
                return this._ctrPlayShape && "playing" != this._ctrPlayShape.style.status && (this._ctrPlayShape.style.status = "playing", this.zr.modShape(this._ctrPlayShape.id), this.zr.refreshNextFrame()), this.timelineOption.autoPlay = null != t ? t : !0, this.timelineOption.autoPlay || clearTimeout(this.playTicket), this.currentIndex = null != e ? e : this.currentIndex + 1, this.currentIndex >= this.timelineOption.data.length && (this.currentIndex = 0), this._onFrame(), this.currentIndex
            },
            stop: function () {
                return this._ctrPlayShape && "stop" != this._ctrPlayShape.style.status && (this._ctrPlayShape.style.status = "stop", this.zr.modShape(this._ctrPlayShape.id), this.zr.refreshNextFrame()), this.timelineOption.autoPlay = !1, clearTimeout(this.playTicket), this.currentIndex
            },
            resize: function () {
                this.timelineOption.show && (this.clear(), this._buildShape(), this._syncHandleShape())
            },
            setTheme: function (e) {
                this.timelineOption = this.reformOption(l.clone(this.option.timeline)), this.timelineOption.label.textStyle = this.getTextStyle(this.timelineOption.label.textStyle), this.timelineOption.checkpointStyle.label.textStyle = this.getTextStyle(this.timelineOption.checkpointStyle.label.textStyle), this.myChart.canvasSupported || (this.timelineOption.realtime = !1), this.timelineOption.show && e && (this.clear(), this._buildShape(), this._syncHandleShape())
            },
            onbeforDispose: function () {
                clearTimeout(this.playTicket)
            }
        }, o.prototype.iconLibrary.timelineControl = i, l.inherits(t, n), e("../component").define("timeline", t), t
    }), i("zrender/shape/Image", ["require", "./Base", "../tool/util"], function (e) {
        var t = e("./Base"),
            i = function (e) {
                t.call(this, e)
            };
        return i.prototype = {
            type: "image",
            brush: function (e, t, i) {
                var n = this.style || {};
                t && (n = this.getHighlightStyle(n, this.highlightStyle || {}));
                var a = n.image,
                    o = this;
                if (this._imageCache || (this._imageCache = {}), "string" == typeof a) {
                    var r = a;
                    this._imageCache[r] ? a = this._imageCache[r] : (a = new Image, a.onload = function () {
                        a.onload = null, o.modSelf(), i()
                    }, a.src = r, this._imageCache[r] = a)
                }
                if (a) {
                    if ("IMG" == a.nodeName.toUpperCase())
                        if (window.ActiveXObject) {
                            if ("complete" != a.readyState) return
                        } else if (!a.complete) return;
                    var s = n.width || a.width,
                        l = n.height || a.height,
                        h = n.x,
                        m = n.y;
                    if (!a.width || !a.height) return;
                    if (e.save(), this.doClip(e), this.setContext(e, n), this.setTransform(e), n.sWidth && n.sHeight) {
                        var V = n.sx || 0,
                            U = n.sy || 0;
                        e.drawImage(a, V, U, n.sWidth, n.sHeight, h, m, s, l)
                    } else if (n.sx && n.sy) {
                        var V = n.sx,
                            U = n.sy,
                            d = s - V,
                            p = l - U;
                        e.drawImage(a, V, U, d, p, h, m, s, l)
                    } else e.drawImage(a, h, m, s, l);
                    n.width || (n.width = s), n.height || (n.height = l), this.style.width || (this.style.width = s), this.style.height || (this.style.height = l), this.drawText(e, n, this.style), e.restore()
                }
            },
            getRect: function (e) {
                return {
                    x: e.x,
                    y: e.y,
                    width: e.width,
                    height: e.height
                }
            },
            clearCache: function () {
                this._imageCache = {}
            }
        }, e("../tool/util").inherits(i, t), i
    }), i("zrender/loadingEffect/Bar", ["require", "./Base", "../tool/util", "../tool/color", "../shape/Rectangle"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/color"),
            o = e("../shape/Rectangle");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            var i = n.merge(this.options, {
                textStyle: {
                    color: "#888"
                },
                backgroundColor: "rgba(250, 250, 250, 0.8)",
                effectOption: {
                    x: 0,
                    y: this.canvasHeight / 2 - 30,
                    width: this.canvasWidth,
                    height: 5,
                    brushType: "fill",
                    timeInterval: 100
                }
            }),
                r = this.createTextShape(i.textStyle),
                s = this.createBackgroundShape(i.backgroundColor),
                l = i.effectOption,
                h = new o({
                    highlightStyle: n.clone(l)
                });
            return h.highlightStyle.color = l.color || a.getLinearGradient(l.x, l.y, l.x + l.width, l.y + l.height, [
                [0, "#ff6400"],
                [.5, "#ffe100"],
                [1, "#b1ff00"]
            ]), null != i.progress ? (e(s), h.highlightStyle.width = this.adjust(i.progress, [0, 1]) * i.effectOption.width, e(h), e(r), void t()) : (h.highlightStyle.width = 0, setInterval(function () {
                e(s), h.highlightStyle.width < l.width ? h.highlightStyle.width += 8 : h.highlightStyle.width = 0, e(h), e(r), t()
            }, l.timeInterval))
        }, t
    }), i("zrender/loadingEffect/Bubble", ["require", "./Base", "../tool/util", "../tool/color", "../shape/Circle"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/color"),
            o = e("../shape/Circle");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            for (var i = n.merge(this.options, {
                textStyle: {
                    color: "#888"
                },
                backgroundColor: "rgba(250, 250, 250, 0.8)",
                effect: {
                    n: 50,
                    lineWidth: 2,
                    brushType: "stroke",
                    color: "random",
                    timeInterval: 100
                }
            }), r = this.createTextShape(i.textStyle), s = this.createBackgroundShape(i.backgroundColor), l = i.effect, h = l.n, m = l.brushType, V = l.lineWidth, U = [], d = this.canvasWidth, p = this.canvasHeight, c = 0; h > c; c++) {
                var u = "random" == l.color ? a.alpha(a.random(), .3) : l.color;
                U[c] = new o({
                    highlightStyle: {
                        x: Math.ceil(Math.random() * d),
                        y: Math.ceil(Math.random() * p),
                        r: Math.ceil(40 * Math.random()),
                        brushType: m,
                        color: u,
                        strokeColor: u,
                        lineWidth: V
                    },
                    animationY: Math.ceil(20 * Math.random())
                })
            }
            return setInterval(function () {
                e(s);
                for (var i = 0; h > i; i++) {
                    var n = U[i].highlightStyle;
                    n.y - U[i].animationY + n.r <= 0 && (U[i].highlightStyle.y = p + n.r, U[i].highlightStyle.x = Math.ceil(Math.random() * d)), U[i].highlightStyle.y -= U[i].animationY, e(U[i])
                }
                e(r), t()
            }, l.timeInterval)
        }, t
    }), i("zrender/loadingEffect/DynamicLine", ["require", "./Base", "../tool/util", "../tool/color", "../shape/Line"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/color"),
            o = e("../shape/Line");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            for (var i = n.merge(this.options, {
                textStyle: {
                    color: "#fff"
                },
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                effectOption: {
                    n: 30,
                    lineWidth: 1,
                    color: "random",
                    timeInterval: 100
                }
            }), r = this.createTextShape(i.textStyle), s = this.createBackgroundShape(i.backgroundColor), l = i.effectOption, h = l.n, m = l.lineWidth, V = [], U = this.canvasWidth, d = this.canvasHeight, p = 0; h > p; p++) {
                var c = -Math.ceil(1e3 * Math.random()),
                    u = Math.ceil(400 * Math.random()),
                    y = Math.ceil(Math.random() * d),
                    g = "random" == l.color ? a.random() : l.color;
                V[p] = new o({
                    highlightStyle: {
                        xStart: c,
                        yStart: y,
                        xEnd: c + u,
                        yEnd: y,
                        strokeColor: g,
                        lineWidth: m
                    },
                    animationX: Math.ceil(100 * Math.random()),
                    len: u
                })
            }
            return setInterval(function () {
                e(s);
                for (var i = 0; h > i; i++) {
                    var n = V[i].highlightStyle;
                    n.xStart >= U && (V[i].len = Math.ceil(400 * Math.random()), n.xStart = -400, n.xEnd = -400 + V[i].len, n.yStart = Math.ceil(Math.random() * d), n.yEnd = n.yStart), n.xStart += V[i].animationX, n.xEnd += V[i].animationX, e(V[i])
                }
                e(r), t()
            }, l.timeInterval)
        }, t
    }), i("zrender/loadingEffect/Ring", ["require", "./Base", "../tool/util", "../tool/color", "../shape/Ring", "../shape/Sector"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/color"),
            o = e("../shape/Ring"),
            r = e("../shape/Sector");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            var i = n.merge(this.options, {
                textStyle: {
                    color: "#07a"
                },
                backgroundColor: "rgba(250, 250, 250, 0.8)",
                effect: {
                    x: this.canvasWidth / 2,
                    y: this.canvasHeight / 2,
                    r0: 60,
                    r: 100,
                    color: "#bbdcff",
                    brushType: "fill",
                    textPosition: "inside",
                    textFont: "normal 30px verdana",
                    textColor: "rgba(30, 144, 255, 0.6)",
                    timeInterval: 100
                }
            }),
                s = i.effect,
                l = i.textStyle;
            null == l.x && (l.x = s.x), null == l.y && (l.y = s.y + (s.r0 + s.r) / 2 - 5);
            for (var h = this.createTextShape(i.textStyle), m = this.createBackgroundShape(i.backgroundColor), V = s.x, U = s.y, d = s.r0 + 6, p = s.r - 6, c = s.color, u = a.lift(c, .1), y = new o({
                highlightStyle: n.clone(s)
            }), g = [], b = a.getGradientColors(["#ff6400", "#ffe100", "#97ff00"], 25), f = 15, k = 240, x = 0; 16 > x; x++) g.push(new r({
                highlightStyle: {
                    x: V,
                    y: U,
                    r0: d,
                    r: p,
                    startAngle: k - f,
                    endAngle: k,
                    brushType: "fill",
                    color: u
                },
                _color: a.getLinearGradient(V + d * Math.cos(k, !0), U - d * Math.sin(k, !0), V + d * Math.cos(k - f, !0), U - d * Math.sin(k - f, !0), [
                    [0, b[2 * x]],
                    [1, b[2 * x + 1]]
                ])
            })), k -= f;
            k = 360;
            for (var x = 0; 4 > x; x++) g.push(new r({
                highlightStyle: {
                    x: V,
                    y: U,
                    r0: d,
                    r: p,
                    startAngle: k - f,
                    endAngle: k,
                    brushType: "fill",
                    color: u
                },
                _color: a.getLinearGradient(V + d * Math.cos(k, !0), U - d * Math.sin(k, !0), V + d * Math.cos(k - f, !0), U - d * Math.sin(k - f, !0), [
                    [0, b[2 * x + 32]],
                    [1, b[2 * x + 33]]
                ])
            })), k -= f;
            var _ = 0;
            if (null != i.progress) {
                e(m), _ = 100 * this.adjust(i.progress, [0, 1]).toFixed(2) / 5, y.highlightStyle.text = 5 * _ + "%", e(y);
                for (var x = 0; 20 > x; x++) g[x].highlightStyle.color = _ > x ? g[x]._color : u, e(g[x]);
                return e(h), void t()
            }
            return setInterval(function () {
                e(m), _ += _ >= 20 ? -20 : 1, e(y);
                for (var i = 0; 20 > i; i++) g[i].highlightStyle.color = _ > i ? g[i]._color : u, e(g[i]);
                e(h), t()
            }, s.timeInterval)
        }, t
    }), i("zrender/loadingEffect/Spin", ["require", "./Base", "../tool/util", "../tool/color", "../tool/area", "../shape/Sector"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/color"),
            o = e("../tool/area"),
            r = e("../shape/Sector");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            var i = n.merge(this.options, {
                textStyle: {
                    color: "#fff",
                    textAlign: "start"
                },
                backgroundColor: "rgba(0, 0, 0, 0.8)"
            }),
                s = this.createTextShape(i.textStyle),
                l = 10,
                h = o.getTextWidth(s.highlightStyle.text, s.highlightStyle.textFont),
                m = o.getTextHeight(s.highlightStyle.text, s.highlightStyle.textFont),
                V = n.merge(this.options.effect || {}, {
                    r0: 9,
                    r: 15,
                    n: 18,
                    color: "#fff",
                    timeInterval: 100
                }),
                U = this.getLocation(this.options.textStyle, h + l + 2 * V.r, Math.max(2 * V.r, m));
            V.x = U.x + V.r, V.y = s.highlightStyle.y = U.y + U.height / 2, s.highlightStyle.x = V.x + V.r + l;
            for (var d = this.createBackgroundShape(i.backgroundColor), p = V.n, c = V.x, u = V.y, y = V.r0, g = V.r, b = V.color, f = [], k = Math.round(180 / p), x = 0; p > x; x++) f[x] = new r({
                highlightStyle: {
                    x: c,
                    y: u,
                    r0: y,
                    r: g,
                    startAngle: k * x * 2,
                    endAngle: k * x * 2 + k,
                    color: a.alpha(b, (x + 1) / p),
                    brushType: "fill"
                }
            });
            var _ = [0, c, u];
            return setInterval(function () {
                e(d), _[0] -= .3;
                for (var i = 0; p > i; i++) f[i].rotation = _, e(f[i]);
                e(s), t()
            }, V.timeInterval)
        }, t
    }), i("zrender/loadingEffect/Whirling", ["require", "./Base", "../tool/util", "../tool/area", "../shape/Ring", "../shape/Droplet", "../shape/Circle"], function (e) {
        function t(e) {
            i.call(this, e)
        }
        var i = e("./Base"),
            n = e("../tool/util"),
            a = e("../tool/area"),
            o = e("../shape/Ring"),
            r = e("../shape/Droplet"),
            s = e("../shape/Circle");
        return n.inherits(t, i), t.prototype._start = function (e, t) {
            var i = n.merge(this.options, {
                textStyle: {
                    color: "#888",
                    textAlign: "start"
                },
                backgroundColor: "rgba(250, 250, 250, 0.8)"
            }),
                l = this.createTextShape(i.textStyle),
                h = 10,
                m = a.getTextWidth(l.highlightStyle.text, l.highlightStyle.textFont),
                V = a.getTextHeight(l.highlightStyle.text, l.highlightStyle.textFont),
                U = n.merge(this.options.effect || {}, {
                    r: 18,
                    colorIn: "#fff",
                    colorOut: "#555",
                    colorWhirl: "#6cf",
                    timeInterval: 50
                }),
                d = this.getLocation(this.options.textStyle, m + h + 2 * U.r, Math.max(2 * U.r, V));
            U.x = d.x + U.r, U.y = l.highlightStyle.y = d.y + d.height / 2, l.highlightStyle.x = U.x + U.r + h;
            var p = this.createBackgroundShape(i.backgroundColor),
                c = new r({
                    highlightStyle: {
                        a: Math.round(U.r / 2),
                        b: Math.round(U.r - U.r / 6),
                        brushType: "fill",
                        color: U.colorWhirl
                    }
                }),
                u = new s({
                    highlightStyle: {
                        r: Math.round(U.r / 6),
                        brushType: "fill",
                        color: U.colorIn
                    }
                }),
                y = new o({
                    highlightStyle: {
                        r0: Math.round(U.r - U.r / 3),
                        r: U.r,
                        brushType: "fill",
                        color: U.colorOut
                    }
                }),
                g = [0, U.x, U.y];
            return c.highlightStyle.x = u.highlightStyle.x = y.highlightStyle.x = g[1], c.highlightStyle.y = u.highlightStyle.y = y.highlightStyle.y = g[2], setInterval(function () {
                e(p), e(y), g[0] -= .3, c.rotation = g, e(c), e(u), e(l), t()
            }, U.timeInterval)
        }, t
    }),
        /*Themes*/
        i("echarts/theme/macarons", [], function () {
            var e = {
                color: ["#2ec7c9", "#b6a2de", "#5ab1ef", "#ffb980", "#d87a80", "#8d98b3", "#e5cf0d", "#97b552", "#95706d", "#dc69aa", "#07a2a4", "#9a7fd1", "#588dd5", "#f5994e", "#c05050", "#59678c", "#c9ab00", "#7eb00a", "#6f5553", "#c14089"],
                title: {
                    textStyle: {
                        fontWeight: "normal",
                        color: "#008acd"
                    }
                },
                dataRange: {
                    itemWidth: 15,
                    color: ["#5ab1ef", "#e0ffff"]
                },
                toolbox: {
                    color: ["#1e90ff", "#1e90ff", "#1e90ff", "#1e90ff"],
                    effectiveColor: "#ff4500"
                },
                tooltip: {
                    backgroundColor: "rgba(50,50,50,0.5)",
                    axisPointer: {
                        type: "line",
                        lineStyle: {
                            color: "#008acd"
                        },
                        crossStyle: {
                            color: "#008acd"
                        },
                        shadowStyle: {
                            color: "rgba(200,200,200,0.2)"
                        }
                    }
                },
                dataZoom: {
                    dataBackgroundColor: "#efefff",
                    fillerColor: "rgba(182,162,222,0.2)",
                    handleColor: "#008acd"
                },
                grid: {
                    borderColor: "#eee"
                },
                categoryAxis: {
                    axisLine: {
                        lineStyle: {
                            color: "#008acd"
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: ["#eee"]
                        }
                    }
                },
                valueAxis: {
                    axisLine: {
                        lineStyle: {
                            color: "#008acd"
                        }
                    },
                    splitArea: {
                        show: !0,
                        areaStyle: {
                            color: ["rgba(250,250,250,0.1)", "rgba(200,200,200,0.1)"]
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: ["#eee"]
                        }
                    }
                },
                polar: {
                    axisLine: {
                        lineStyle: {
                            color: "#ddd"
                        }
                    },
                    splitArea: {
                        show: !0,
                        areaStyle: {
                            color: ["rgba(250,250,250,0.2)", "rgba(200,200,200,0.2)"]
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: "#ddd"
                        }
                    }
                },
                timeline: {
                    lineStyle: {
                        color: "#008acd"
                    },
                    controlStyle: {
                        normal: {
                            color: "#008acd"
                        },
                        emphasis: {
                            color: "#008acd"
                        }
                    },
                    symbol: "emptyCircle",
                    symbolSize: 3
                },
                bar: {
                    itemStyle: {
                        normal: {
                            barBorderRadius: 5
                        },
                        emphasis: {
                            barBorderRadius: 5
                        }
                    }
                },
                line: {
                    smooth: !0,
                    symbol: "emptyCircle",
                    symbolSize: 3
                },
                k: {
                    itemStyle: {
                        normal: {
                            color: "#d87a80",
                            color0: "#2ec7c9",
                            lineStyle: {
                                color: "#d87a80",
                                color0: "#2ec7c9"
                            }
                        }
                    }
                },
                scatter: {
                    symbol: "circle",
                    symbolSize: 4
                },
                radar: {
                    symbol: "emptyCircle",
                    symbolSize: 3
                },
                map: {
                    itemStyle: {
                        normal: {
                            areaStyle: {
                                color: "#ddd"
                            },
                            label: {
                                textStyle: {
                                    color: "#d87a80"
                                }
                            }
                        },
                        emphasis: {
                            areaStyle: {
                                color: "#fe994e"
                            }
                        }
                    }
                },
                force: {
                    itemStyle: {
                        normal: {
                            linkStyle: {
                                color: "#1e90ff"
                            }
                        }
                    }
                },
                chord: {
                    itemStyle: {
                        normal: {
                            borderWidth: 1,
                            borderColor: "rgba(128, 128, 128, 0.5)",
                            chordStyle: {
                                lineStyle: {
                                    color: "rgba(128, 128, 128, 0.5)"
                                }
                            }
                        },
                        emphasis: {
                            borderWidth: 1,
                            borderColor: "rgba(128, 128, 128, 0.5)",
                            chordStyle: {
                                lineStyle: {
                                    color: "rgba(128, 128, 128, 0.5)"
                                }
                            }
                        }
                    }
                },
                gauge: {
                    axisLine: {
                        lineStyle: {
                            color: [
                                [.2, "#2ec7c9"],
                                [.8, "#5ab1ef"],
                                [1, "#d87a80"]
                            ],
                            width: 10
                        }
                    },
                    axisTick: {
                        splitNumber: 10,
                        length: 15,
                        lineStyle: {
                            color: "auto"
                        }
                    },
                    splitLine: {
                        length: 22,
                        lineStyle: {
                            color: "auto"
                        }
                    },
                    pointer: {
                        width: 5
                    }
                },
                textStyle: {
                    fontFamily: "微软雅黑, Arial, Verdana, sans-serif"
                }
            };
            return e
        }), i("echarts/theme/infographic", [], function () {
            var e = {
                color: ["#C1232B", "#B5C334", "#FCCE10", "#E87C25", "#27727B", "#FE8463", "#9BCA63", "#FAD860", "#F3A43B", "#60C0DD", "#D7504B", "#C6E579", "#F4E001", "#F0805A", "#26C0C0"],
                title: {
                    textStyle: {
                        fontWeight: "normal",
                        color: "#27727B"
                    }
                },
                dataRange: {
                    x: "right",
                    y: "center",
                    itemWidth: 5,
                    itemHeight: 25,
                    color: ["#C1232B", "#FCCE10"]
                },
                toolbox: {
                    color: ["#C1232B", "#B5C334", "#FCCE10", "#E87C25", "#27727B", "#FE8463", "#9BCA63", "#FAD860", "#F3A43B", "#60C0DD"],
                    effectiveColor: "#ff4500"
                },
                tooltip: {
                    backgroundColor: "rgba(50,50,50,0.5)",
                    axisPointer: {
                        type: "line",
                        lineStyle: {
                            color: "#27727B",
                            type: "dashed"
                        },
                        crossStyle: {
                            color: "#27727B"
                        },
                        shadowStyle: {
                            color: "rgba(200,200,200,0.3)"
                        }
                    }
                },
                dataZoom: {
                    dataBackgroundColor: "rgba(181,195,52,0.3)",
                    fillerColor: "rgba(181,195,52,0.2)",
                    handleColor: "#27727B"
                },
                grid: {
                    borderWidth: 0
                },
                categoryAxis: {
                    axisLine: {
                        lineStyle: {
                            color: "#27727B"
                        }
                    },
                    splitLine: {
                        show: !1
                    }
                },
                valueAxis: {
                    axisLine: {
                        show: !1
                    },
                    splitArea: {
                        show: !1
                    },
                    splitLine: {
                        lineStyle: {
                            color: ["#ccc"],
                            type: "dashed"
                        }
                    }
                },
                polar: {
                    axisLine: {
                        lineStyle: {
                            color: "#ddd"
                        }
                    },
                    splitArea: {
                        show: !0,
                        areaStyle: {
                            color: ["rgba(250,250,250,0.2)", "rgba(200,200,200,0.2)"]
                        }
                    },
                    splitLine: {
                        lineStyle: {
                            color: "#ddd"
                        }
                    }
                },
                timeline: {
                    lineStyle: {
                        color: "#27727B"
                    },
                    controlStyle: {
                        normal: {
                            color: "#27727B"
                        },
                        emphasis: {
                            color: "#27727B"
                        }
                    },
                    symbol: "emptyCircle",
                    symbolSize: 3
                },
                line: {
                    itemStyle: {
                        normal: {
                            borderWidth: 2,
                            borderColor: "#fff",
                            lineStyle: {
                                width: 3
                            }
                        },
                        emphasis: {
                            borderWidth: 0
                        }
                    },
                    symbol: "circle",
                    symbolSize: 3.5
                },
                k: {
                    itemStyle: {
                        normal: {
                            color: "#C1232B",
                            color0: "#B5C334",
                            lineStyle: {
                                width: 1,
                                color: "#C1232B",
                                color0: "#B5C334"
                            }
                        }
                    }
                },
                scatter: {
                    itemStyle: {
                        normal: {
                            borderWidth: 1,
                            borderColor: "rgba(200,200,200,0.5)"
                        },
                        emphasis: {
                            borderWidth: 0
                        }
                    },
                    symbol: "star4",
                    symbolSize: 4
                },
                radar: {
                    symbol: "emptyCircle",
                    symbolSize: 3
                },
                map: {
                    itemStyle: {
                        normal: {
                            areaStyle: {
                                color: "#ddd"
                            },
                            label: {
                                textStyle: {
                                    color: "#C1232B"
                                }
                            }
                        },
                        emphasis: {
                            areaStyle: {
                                color: "#fe994e"
                            },
                            label: {
                                textStyle: {
                                    color: "rgb(100,0,0)"
                                }
                            }
                        }
                    }
                },
                force: {
                    itemStyle: {
                        normal: {
                            linkStyle: {
                                color: "#27727B"
                            }
                        }
                    }
                },
                chord: {
                    itemStyle: {
                        normal: {
                            borderWidth: 1,
                            borderColor: "rgba(128, 128, 128, 0.5)",
                            chordStyle: {
                                lineStyle: {
                                    color: "rgba(128, 128, 128, 0.5)"
                                }
                            }
                        },
                        emphasis: {
                            borderWidth: 1,
                            borderColor: "rgba(128, 128, 128, 0.5)",
                            chordStyle: {
                                lineStyle: {
                                    color: "rgba(128, 128, 128, 0.5)"
                                }
                            }
                        }
                    }
                },
                gauge: {
                    center: ["50%", "80%"],
                    radius: "100%",
                    startAngle: 180,
                    endAngle: 0,
                    axisLine: {
                        show: !0,
                        lineStyle: {
                            color: [
                                [.2, "#B5C334"],
                                [.8, "#27727B"],
                                [1, "#C1232B"]
                            ],
                            width: "40%"
                        }
                    },
                    axisTick: {
                        splitNumber: 2,
                        length: 5,
                        lineStyle: {
                            color: "#fff"
                        }
                    },
                    axisLabel: {
                        textStyle: {
                            color: "#fff",
                            fontWeight: "bolder"
                        }
                    },
                    splitLine: {
                        length: "5%",
                        lineStyle: {
                            color: "#fff"
                        }
                    },
                    pointer: {
                        width: "40%",
                        length: "80%",
                        color: "#fff"
                    },
                    title: {
                        offsetCenter: [0, -20],
                        textStyle: {
                            color: "auto",
                            fontSize: 20
                        }
                    },
                    detail: {
                        offsetCenter: [0, 0],
                        textStyle: {
                            color: "auto",
                            fontSize: 40
                        }
                    }
                },
                textStyle: {
                    fontFamily: "微软雅黑, Arial, Verdana, sans-serif"
                }
            };
            return e
        }), i("echarts/theme/dark", [], function () {
            var e = {
                color: ["#FE8463", "#9BCA63", "#FAD860", "#60C0DD", "#0084C6", "#D7504B", "#C6E579", "#26C0C0", "#F0805A", "#F4E001", "#B5C334"],
                backgroundColor: "#1b1b1b",
                title: {
                    textStyle: {
                        fontWeight: "normal",
                        color: "#fff"
                    }
                },
                legend: {
                    textStyle: {
                        color: "#ccc"
                    }
                },
                dataRange: {
                    itemWidth: 15,
                    color: ["#FFF808", "#21BCF9"],
                    textStyle: {
                        color: "#ccc"
                    }
                },
                toolbox: {
                    color: ["#fff", "#fff", "#fff", "#fff"],
                    effectiveColor: "#FE8463",
                    disableColor: "#666"
                },
                tooltip: {
                    backgroundColor: "rgba(250,250,250,0.8)",
                    axisPointer: {
                        type: "line",
                        lineStyle: {
                            color: "#aaa"
                        }
                    }
                }
            }
        });
}