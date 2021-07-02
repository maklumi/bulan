
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    function requiredArgs(required, args) {
      if (args.length < required) {
        throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
      }
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */

    function toDate(argument) {
      requiredArgs(1, arguments);
      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    /**
     * @name addDays
     * @category Day Helpers
     * @summary Add the specified number of days to the given date.
     *
     * @description
     * Add the specified number of days to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of days to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} - the new date with the days added
     * @throws {TypeError} - 2 arguments required
     *
     * @example
     * // Add 10 days to 1 September 2014:
     * const result = addDays(new Date(2014, 8, 1), 10)
     * //=> Thu Sep 11 2014 00:00:00
     */

    function addDays(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var amount = toInteger(dirtyAmount);

      if (isNaN(amount)) {
        return new Date(NaN);
      }

      if (!amount) {
        // If 0 days, no-op to avoid changing times in the hour before end of DST
        return date;
      }

      date.setDate(date.getDate() + amount);
      return date;
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * const result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */
    function getTimezoneOffsetInMilliseconds(date) {
      var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
      utcDate.setUTCFullYear(date.getFullYear());
      return date.getTime() - utcDate.getTime();
    }

    /**
     * @name startOfDay
     * @category Day Helpers
     * @summary Return the start of a day for the given date.
     *
     * @description
     * Return the start of a day for the given date.
     * The result will be in the local timezone.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the original date
     * @returns {Date} the start of a day
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // The start of a day for 2 September 2014 11:55:00:
     * const result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
     * //=> Tue Sep 02 2014 00:00:00
     */

    function startOfDay(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    var MILLISECONDS_IN_DAY$1 = 86400000;
    /**
     * @name differenceInCalendarDays
     * @category Day Helpers
     * @summary Get the number of calendar days between the given dates.
     *
     * @description
     * Get the number of calendar days between the given dates. This means that the times are removed
     * from the dates and then the difference in days is calculated.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} dateLeft - the later date
     * @param {Date|Number} dateRight - the earlier date
     * @returns {Number} the number of calendar days
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // How many calendar days are between
     * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
     * const result = differenceInCalendarDays(
     *   new Date(2012, 6, 2, 0, 0),
     *   new Date(2011, 6, 2, 23, 0)
     * )
     * //=> 366
     * // How many calendar days are between
     * // 2 July 2011 23:59:00 and 3 July 2011 00:01:00?
     * const result = differenceInCalendarDays(
     *   new Date(2011, 6, 3, 0, 1),
     *   new Date(2011, 6, 2, 23, 59)
     * )
     * //=> 1
     */

    function differenceInCalendarDays(dirtyDateLeft, dirtyDateRight) {
      requiredArgs(2, arguments);
      var startOfDayLeft = startOfDay(dirtyDateLeft);
      var startOfDayRight = startOfDay(dirtyDateRight);
      var timestampLeft = startOfDayLeft.getTime() - getTimezoneOffsetInMilliseconds(startOfDayLeft);
      var timestampRight = startOfDayRight.getTime() - getTimezoneOffsetInMilliseconds(startOfDayRight); // Round the number of days to the nearest integer
      // because the number of milliseconds in a day is not constant
      // (e.g. it's different in the day of the daylight saving time clock shift)

      return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY$1);
    }

    /**
     * @name isValid
     * @category Common Helpers
     * @summary Is the given date valid?
     *
     * @description
     * Returns false if argument is Invalid Date and true otherwise.
     * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * Invalid Date is a Date, whose time value is NaN.
     *
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Now `isValid` doesn't throw an exception
     *   if the first argument is not an instance of Date.
     *   Instead, argument is converted beforehand using `toDate`.
     *
     *   Examples:
     *
     *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
     *   |---------------------------|---------------|---------------|
     *   | `new Date()`              | `true`        | `true`        |
     *   | `new Date('2016-01-01')`  | `true`        | `true`        |
     *   | `new Date('')`            | `false`       | `false`       |
     *   | `new Date(1488370835081)` | `true`        | `true`        |
     *   | `new Date(NaN)`           | `false`       | `false`       |
     *   | `'2016-01-01'`            | `TypeError`   | `false`       |
     *   | `''`                      | `TypeError`   | `false`       |
     *   | `1488370835081`           | `TypeError`   | `true`        |
     *   | `NaN`                     | `TypeError`   | `false`       |
     *
     *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
     *   that try to coerce arguments to the expected type
     *   (which is also the case with other *date-fns* functions).
     *
     * @param {*} date - the date to check
     * @returns {Boolean} the date is valid
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // For the valid date:
     * var result = isValid(new Date(2014, 1, 31))
     * //=> true
     *
     * @example
     * // For the value, convertable into a date:
     * var result = isValid(1393804800000)
     * //=> true
     *
     * @example
     * // For the invalid date:
     * var result = isValid(new Date(''))
     * //=> false
     */

    function isValid(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      return !isNaN(date);
    }

    /**
     * @name differenceInMilliseconds
     * @category Millisecond Helpers
     * @summary Get the number of milliseconds between the given dates.
     *
     * @description
     * Get the number of milliseconds between the given dates.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} dateLeft - the later date
     * @param {Date|Number} dateRight - the earlier date
     * @returns {Number} the number of milliseconds
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // How many milliseconds are between
     * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
     * const result = differenceInMilliseconds(
     *   new Date(2014, 6, 2, 12, 30, 21, 700),
     *   new Date(2014, 6, 2, 12, 30, 20, 600)
     * )
     * //=> 1100
     */

    function differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) {
      requiredArgs(2, arguments);
      var dateLeft = toDate(dirtyDateLeft);
      var dateRight = toDate(dirtyDateRight);
      return dateLeft.getTime() - dateRight.getTime();
    }

    var formatDistanceLocale$1 = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXWeeks: {
        one: 'about 1 week',
        other: 'about {{count}} weeks'
      },
      xWeeks: {
        one: '1 week',
        other: '{{count}} weeks'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };
    function formatDistance$1(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale$1[token] === 'string') {
        result = formatDistanceLocale$1[token];
      } else if (count === 1) {
        result = formatDistanceLocale$1[token].one;
      } else {
        result = formatDistanceLocale$1[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    }

    function buildFormatLongFn(args) {
      return function (dirtyOptions) {
        var options = dirtyOptions || {};
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats$1 = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats$1 = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats$1 = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong$1 = {
      date: buildFormatLongFn({
        formats: dateFormats$1,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats$1,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats$1,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale$1 = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };
    function formatRelative$1(token, _date, _baseDate, _options) {
      return formatRelativeLocale$1[token];
    }

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
        return valuesArray[index];
      };
    }

    var eraValues$1 = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues$1 = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'] // Note: in English, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues$1 = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues$1 = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues$1 = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues$1 = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    function ordinalNumber$1(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`:
      //
      //   var options = dirtyOptions || {}
      //   var unit = String(options.unit)
      //
      // where `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    }

    var localize$1 = {
      ordinalNumber: ordinalNumber$1,
      era: buildLocalizeFn({
        values: eraValues$1,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues$1,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues$1,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues$1,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues$1,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues$1,
        defaultFormattingWidth: 'wide'
      })
    };

    function buildMatchPatternFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var matchResult = string.match(args.matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);

        if (!parseResult) {
          return null;
        }

        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function buildMatchFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var value;

        if (Object.prototype.toString.call(parsePatterns) === '[object Array]') {
          value = findIndex(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        } else {
          value = findKey(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        }

        value = args.valueCallback ? args.valueCallback(value) : value;
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }
    }

    function findIndex(array, predicate) {
      for (var key = 0; key < array.length; key++) {
        if (predicate(array[key])) {
          return key;
        }
      }
    }

    var matchOrdinalNumberPattern$1 = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern$1 = /\d+/i;
    var matchEraPatterns$1 = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns$1 = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns$1 = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns$1 = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns$1 = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns$1 = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns$1 = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns$1 = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns$1 = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns$1 = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match$1 = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern$1,
        parsePattern: parseOrdinalNumberPattern$1,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns$1,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns$1,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns$1,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns$1,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns$1,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns$1,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns$1,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */

    var locale$1 = {
      code: 'en-US',
      formatDistance: formatDistance$1,
      formatLong: formatLong$1,
      formatRelative: formatRelative$1,
      localize: localize$1,
      match: match$1,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * const result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    function addLeadingZeros(number, targetLength) {
      var sign = number < 0 ? '-' : '';
      var output = Math.abs(number).toString();

      while (output.length < targetLength) {
        output = '0' + output;
      }

      return sign + output;
    }

    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* |                                |
     * |  d  | Day of month                   |  D  |                                |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  m  | Minute                         |  M  | Month                          |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  y  | Year (abs)                     |  Y  |                                |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     */

    var formatters$1 = {
      // Year
      y: function (date, token) {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
      },
      // Month
      M: function (date, token) {
        var month = date.getUTCMonth();
        return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
      },
      // Day of the month
      d: function (date, token) {
        return addLeadingZeros(date.getUTCDate(), token.length);
      },
      // AM or PM
      a: function (date, token) {
        var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
            return dayPeriodEnumValue.toUpperCase();

          case 'aaa':
            return dayPeriodEnumValue;

          case 'aaaaa':
            return dayPeriodEnumValue[0];

          case 'aaaa':
          default:
            return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
        }
      },
      // Hour [1-12]
      h: function (date, token) {
        return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
      },
      // Hour [0-23]
      H: function (date, token) {
        return addLeadingZeros(date.getUTCHours(), token.length);
      },
      // Minute
      m: function (date, token) {
        return addLeadingZeros(date.getUTCMinutes(), token.length);
      },
      // Second
      s: function (date, token) {
        return addLeadingZeros(date.getUTCSeconds(), token.length);
      },
      // Fraction of second
      S: function (date, token) {
        var numberOfDigits = token.length;
        var milliseconds = date.getUTCMilliseconds();
        var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
        return addLeadingZeros(fractionalSeconds, token.length);
      }
    };

    var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCDayOfYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    var dayPeriodEnum = {
      am: 'am',
      pm: 'pm',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
      /*
       * |     | Unit                           |     | Unit                           |
       * |-----|--------------------------------|-----|--------------------------------|
       * |  a  | AM, PM                         |  A* | Milliseconds in day            |
       * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
       * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
       * |  d  | Day of month                   |  D  | Day of year                    |
       * |  e  | Local day of week              |  E  | Day of week                    |
       * |  f  |                                |  F* | Day of week in month           |
       * |  g* | Modified Julian day            |  G  | Era                            |
       * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
       * |  i! | ISO day of week                |  I! | ISO week of year               |
       * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
       * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
       * |  l* | (deprecated)                   |  L  | Stand-alone month              |
       * |  m  | Minute                         |  M  | Month                          |
       * |  n  |                                |  N  |                                |
       * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
       * |  p! | Long localized time            |  P! | Long localized date            |
       * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
       * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
       * |  s  | Second                         |  S  | Fraction of second             |
       * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
       * |  u  | Extended year                  |  U* | Cyclic year                    |
       * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
       * |  w  | Local week of year             |  W* | Week of month                  |
       * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
       * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
       * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
       *
       * Letters marked by * are not implemented but reserved by Unicode standard.
       *
       * Letters marked by ! are non-standard, but implemented by date-fns:
       * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
       * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
       *   i.e. 7 for Sunday, 1 for Monday, etc.
       * - `I` is ISO week of year, as opposed to `w` which is local week of year.
       * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
       *   `R` is supposed to be used in conjunction with `I` and `i`
       *   for universal ISO week-numbering date, whereas
       *   `Y` is supposed to be used in conjunction with `w` and `e`
       *   for week-numbering date specific to the locale.
       * - `P` is long localized date format
       * - `p` is long localized time format
       */

    };
    var formatters = {
      // Era
      G: function (date, token, localize) {
        var era = date.getUTCFullYear() > 0 ? 1 : 0;

        switch (token) {
          // AD, BC
          case 'G':
          case 'GG':
          case 'GGG':
            return localize.era(era, {
              width: 'abbreviated'
            });
          // A, B

          case 'GGGGG':
            return localize.era(era, {
              width: 'narrow'
            });
          // Anno Domini, Before Christ

          case 'GGGG':
          default:
            return localize.era(era, {
              width: 'wide'
            });
        }
      },
      // Year
      y: function (date, token, localize) {
        // Ordinal number
        if (token === 'yo') {
          var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

          var year = signedYear > 0 ? signedYear : 1 - signedYear;
          return localize.ordinalNumber(year, {
            unit: 'year'
          });
        }

        return formatters$1.y(date, token);
      },
      // Local week-numbering year
      Y: function (date, token, localize, options) {
        var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

        if (token === 'YY') {
          var twoDigitYear = weekYear % 100;
          return addLeadingZeros(twoDigitYear, 2);
        } // Ordinal number


        if (token === 'Yo') {
          return localize.ordinalNumber(weekYear, {
            unit: 'year'
          });
        } // Padding


        return addLeadingZeros(weekYear, token.length);
      },
      // ISO week-numbering year
      R: function (date, token) {
        var isoWeekYear = getUTCISOWeekYear(date); // Padding

        return addLeadingZeros(isoWeekYear, token.length);
      },
      // Extended year. This is a single number designating the year of this calendar system.
      // The main difference between `y` and `u` localizers are B.C. years:
      // | Year | `y` | `u` |
      // |------|-----|-----|
      // | AC 1 |   1 |   1 |
      // | BC 1 |   1 |   0 |
      // | BC 2 |   2 |  -1 |
      // Also `yy` always returns the last two digits of a year,
      // while `uu` pads single digit years to 2 characters and returns other years unchanged.
      u: function (date, token) {
        var year = date.getUTCFullYear();
        return addLeadingZeros(year, token.length);
      },
      // Quarter
      Q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'Q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'QQ':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'Qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'QQQ':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'QQQQQ':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'formatting'
            });
          // 1st quarter, 2nd quarter, ...

          case 'QQQQ':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone quarter
      q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'qq':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'qqq':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'qqqqq':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'standalone'
            });
          // 1st quarter, 2nd quarter, ...

          case 'qqqq':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Month
      M: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          case 'M':
          case 'MM':
            return formatters$1.M(date, token);
          // 1st, 2nd, ..., 12th

          case 'Mo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'MMM':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // J, F, ..., D

          case 'MMMMM':
            return localize.month(month, {
              width: 'narrow',
              context: 'formatting'
            });
          // January, February, ..., December

          case 'MMMM':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone month
      L: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          // 1, 2, ..., 12
          case 'L':
            return String(month + 1);
          // 01, 02, ..., 12

          case 'LL':
            return addLeadingZeros(month + 1, 2);
          // 1st, 2nd, ..., 12th

          case 'Lo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'LLL':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // J, F, ..., D

          case 'LLLLL':
            return localize.month(month, {
              width: 'narrow',
              context: 'standalone'
            });
          // January, February, ..., December

          case 'LLLL':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Local week of year
      w: function (date, token, localize, options) {
        var week = getUTCWeek(date, options);

        if (token === 'wo') {
          return localize.ordinalNumber(week, {
            unit: 'week'
          });
        }

        return addLeadingZeros(week, token.length);
      },
      // ISO week of year
      I: function (date, token, localize) {
        var isoWeek = getUTCISOWeek(date);

        if (token === 'Io') {
          return localize.ordinalNumber(isoWeek, {
            unit: 'week'
          });
        }

        return addLeadingZeros(isoWeek, token.length);
      },
      // Day of the month
      d: function (date, token, localize) {
        if (token === 'do') {
          return localize.ordinalNumber(date.getUTCDate(), {
            unit: 'date'
          });
        }

        return formatters$1.d(date, token);
      },
      // Day of year
      D: function (date, token, localize) {
        var dayOfYear = getUTCDayOfYear(date);

        if (token === 'Do') {
          return localize.ordinalNumber(dayOfYear, {
            unit: 'dayOfYear'
          });
        }

        return addLeadingZeros(dayOfYear, token.length);
      },
      // Day of week
      E: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();

        switch (token) {
          // Tue
          case 'E':
          case 'EE':
          case 'EEE':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'EEEEE':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'EEEEEE':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'EEEE':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Local day of week
      e: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (Nth day of week with current locale or weekStartsOn)
          case 'e':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'ee':
            return addLeadingZeros(localDayOfWeek, 2);
          // 1st, 2nd, ..., 7th

          case 'eo':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'eee':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'eeeee':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'eeeeee':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'eeee':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone local day of week
      c: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (same as in `e`)
          case 'c':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'cc':
            return addLeadingZeros(localDayOfWeek, token.length);
          // 1st, 2nd, ..., 7th

          case 'co':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'ccc':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // T

          case 'ccccc':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'standalone'
            });
          // Tu

          case 'cccccc':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'standalone'
            });
          // Tuesday

          case 'cccc':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // ISO day of week
      i: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();
        var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        switch (token) {
          // 2
          case 'i':
            return String(isoDayOfWeek);
          // 02

          case 'ii':
            return addLeadingZeros(isoDayOfWeek, token.length);
          // 2nd

          case 'io':
            return localize.ordinalNumber(isoDayOfWeek, {
              unit: 'day'
            });
          // Tue

          case 'iii':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'iiiii':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'iiiiii':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'iiii':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM or PM
      a: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'aaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            }).toLowerCase();

          case 'aaaaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'aaaa':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM, PM, midnight, noon
      b: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours === 12) {
          dayPeriodEnumValue = dayPeriodEnum.noon;
        } else if (hours === 0) {
          dayPeriodEnumValue = dayPeriodEnum.midnight;
        } else {
          dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
        }

        switch (token) {
          case 'b':
          case 'bb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'bbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            }).toLowerCase();

          case 'bbbbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'bbbb':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // in the morning, in the afternoon, in the evening, at night
      B: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours >= 17) {
          dayPeriodEnumValue = dayPeriodEnum.evening;
        } else if (hours >= 12) {
          dayPeriodEnumValue = dayPeriodEnum.afternoon;
        } else if (hours >= 4) {
          dayPeriodEnumValue = dayPeriodEnum.morning;
        } else {
          dayPeriodEnumValue = dayPeriodEnum.night;
        }

        switch (token) {
          case 'B':
          case 'BB':
          case 'BBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'BBBBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'BBBB':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Hour [1-12]
      h: function (date, token, localize) {
        if (token === 'ho') {
          var hours = date.getUTCHours() % 12;
          if (hours === 0) hours = 12;
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return formatters$1.h(date, token);
      },
      // Hour [0-23]
      H: function (date, token, localize) {
        if (token === 'Ho') {
          return localize.ordinalNumber(date.getUTCHours(), {
            unit: 'hour'
          });
        }

        return formatters$1.H(date, token);
      },
      // Hour [0-11]
      K: function (date, token, localize) {
        var hours = date.getUTCHours() % 12;

        if (token === 'Ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Hour [1-24]
      k: function (date, token, localize) {
        var hours = date.getUTCHours();
        if (hours === 0) hours = 24;

        if (token === 'ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Minute
      m: function (date, token, localize) {
        if (token === 'mo') {
          return localize.ordinalNumber(date.getUTCMinutes(), {
            unit: 'minute'
          });
        }

        return formatters$1.m(date, token);
      },
      // Second
      s: function (date, token, localize) {
        if (token === 'so') {
          return localize.ordinalNumber(date.getUTCSeconds(), {
            unit: 'second'
          });
        }

        return formatters$1.s(date, token);
      },
      // Fraction of second
      S: function (date, token) {
        return formatters$1.S(date, token);
      },
      // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
      X: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        if (timezoneOffset === 0) {
          return 'Z';
        }

        switch (token) {
          // Hours and optional minutes
          case 'X':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XX`

          case 'XXXX':
          case 'XX':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XXX`

          case 'XXXXX':
          case 'XXX': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
      x: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Hours and optional minutes
          case 'x':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xx`

          case 'xxxx':
          case 'xx':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xxx`

          case 'xxxxx':
          case 'xxx': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (GMT)
      O: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'O':
          case 'OO':
          case 'OOO':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'OOOO':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (specific non-location)
      z: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'z':
          case 'zz':
          case 'zzz':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'zzzz':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Seconds timestamp
      t: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = Math.floor(originalDate.getTime() / 1000);
        return addLeadingZeros(timestamp, token.length);
      },
      // Milliseconds timestamp
      T: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = originalDate.getTime();
        return addLeadingZeros(timestamp, token.length);
      }
    };

    function formatTimezoneShort(offset, dirtyDelimiter) {
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;

      if (minutes === 0) {
        return sign + String(hours);
      }

      var delimiter = dirtyDelimiter || '';
      return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
    }

    function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
      if (offset % 60 === 0) {
        var sign = offset > 0 ? '-' : '+';
        return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
      }

      return formatTimezone(offset, dirtyDelimiter);
    }

    function formatTimezone(offset, dirtyDelimiter) {
      var delimiter = dirtyDelimiter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
      var minutes = addLeadingZeros(absOffset % 60, 2);
      return sign + hours + delimiter + minutes;
    }

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/);
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token, format, input) {
      if (token === 'YYYY') {
        throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'YY') {
        throw new RangeError("Use `yy` instead of `YY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'D') {
        throw new RangeError("Use `d` instead of `D` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'DD') {
        throw new RangeError("Use `dd` instead of `DD` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      }
    }

    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'([^]*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name format
     * @category Common Helpers
     * @summary Format the date.
     *
     * @description
     * Return the formatted date string in the given format. The result may vary by locale.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     * (see the last example)
     *
     * Format of the string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 7 below the table).
     *
     * Accepted patterns:
     * | Unit                            | Pattern | Result examples                   | Notes |
     * |---------------------------------|---------|-----------------------------------|-------|
     * | Era                             | G..GGG  | AD, BC                            |       |
     * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 | GGGGG   | A, B                              |       |
     * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
     * |                                 | yy      | 44, 01, 00, 17                    | 5     |
     * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
     * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
     * |                                 | yyyyy   | ...                               | 3,5   |
     * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
     * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
     * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
     * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
     * |                                 | YYYYY   | ...                               | 3,5   |
     * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
     * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
     * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
     * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
     * |                                 | RRRRR   | ...                               | 3,5,7 |
     * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
     * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
     * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
     * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
     * |                                 | uuuuu   | ...                               | 3,5   |
     * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
     * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | QQ      | 01, 02, 03, 04                    |       |
     * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
     * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | qq      | 01, 02, 03, 04                    |       |
     * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
     * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
     * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | MM      | 01, 02, ..., 12                   |       |
     * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 | MMMM    | January, February, ..., December  | 2     |
     * |                                 | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
     * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | LL      | 01, 02, ..., 12                   |       |
     * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 | LLLL    | January, February, ..., December  | 2     |
     * |                                 | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | w       | 1, 2, ..., 53                     |       |
     * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
     * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | II      | 01, 02, ..., 53                   | 7     |
     * | Day of month                    | d       | 1, 2, ..., 31                     |       |
     * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
     * |                                 | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
     * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
     * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
     * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 | DDDD    | ...                               | 3     |
     * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
     * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
     * |                                 | ii      | 01, 02, ..., 07                   | 7     |
     * |                                 | iii     | Mon, Tue, Wed, ..., Sun           | 7     |
     * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
     * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
     * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 7     |
     * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | ee      | 02, 03, ..., 01                   |       |
     * |                                 | eee     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | cc      | 02, 03, ..., 01                   |       |
     * |                                 | ccc     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          | a..aa   | AM, PM                            |       |
     * |                                 | aaa     | am, pm                            |       |
     * |                                 | aaaa    | a.m., p.m.                        | 2     |
     * |                                 | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          | b..bb   | AM, PM, noon, midnight            |       |
     * |                                 | bbb     | am, pm, noon, midnight            |       |
     * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
     * |                                 | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
     * |                                 | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
     * |                                 | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
     * |                                 | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
     * |                                 | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          | m       | 0, 1, ..., 59                     |       |
     * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | mm      | 00, 01, ..., 59                   |       |
     * | Second                          | s       | 0, 1, ..., 59                     |       |
     * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | ss      | 00, 01, ..., 59                   |       |
     * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
     * |                                 | SS      | 00, 01, ..., 99                   |       |
     * |                                 | SSS     | 000, 001, ..., 999                |       |
     * |                                 | SSSS    | ...                               | 3     |
     * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
     * |                                 | XX      | -0800, +0530, Z                   |       |
     * |                                 | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
     * |                                 | xx      | -0800, +0530, +0000               |       |
     * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
     * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
     * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
     * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
     * | Seconds timestamp               | t       | 512969520                         | 7     |
     * |                                 | tt      | ...                               | 3,7   |
     * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
     * |                                 | TT      | ...                               | 3,7   |
     * | Long localized date             | P       | 04/29/1453                        | 7     |
     * |                                 | PP      | Apr 29, 1453                      | 7     |
     * |                                 | PPP     | April 29th, 1453                  | 7     |
     * |                                 | PPPP    | Friday, April 29th, 1453          | 2,7   |
     * | Long localized time             | p       | 12:00 AM                          | 7     |
     * |                                 | pp      | 12:00:00 AM                       | 7     |
     * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
     * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
     * | Combination of date and time    | Pp      | 04/29/1453, 12:00 AM              | 7     |
     * |                                 | PPpp    | Apr 29, 1453, 12:00:00 AM         | 7     |
     * |                                 | PPPppp  | April 29th, 1453 at ...           | 7     |
     * |                                 | PPPPpppp| Friday, April 29th, 1453 at ...   | 2,7   |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
     *    the output will be the same as default pattern for this unit, usually
     *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
     *    are marked with "2" in the last column of the table.
     *
     *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
     *
     * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
     *    The output will be padded with zeros to match the length of the pattern.
     *
     *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
     *
     * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 5. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` always returns the last two digits of a year,
     *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
     *
     *    | Year | `yy` | `uu` |
     *    |------|------|------|
     *    | 1    |   01 |   01 |
     *    | 14   |   14 |   14 |
     *    | 376  |   76 |  376 |
     *    | 1453 |   53 | 1453 |
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
     *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
     *
     * 6. Specific non-location timezones are currently unavailable in `date-fns`,
     *    so right now these tokens fall back to GMT timezones.
     *
     * 7. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `t`: seconds timestamp
     *    - `T`: milliseconds timestamp
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 9. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The second argument is now required for the sake of explicitness.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   format(new Date(2016, 0, 1))
     *
     *   // v2.0.0 onward
     *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
     *   ```
     *
     * - New format string API for `format` function
     *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
     *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
     *
     * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
     *
     * @param {Date|Number} date - the original date
     * @param {String} format - the string of tokens
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {String} the formatted date string
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `date` must not be Invalid Date
     * @throws {RangeError} `options.locale` must contain `localize` property
     * @throws {RangeError} `options.locale` must contain `formatLong` property
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Represent 11 February 2014 in middle-endian format:
     * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
     * //=> '02/11/2014'
     *
     * @example
     * // Represent 2 July 2014 in Esperanto:
     * import { eoLocale } from 'date-fns/locale/eo'
     * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
     *   locale: eoLocale
     * })
     * //=> '2-a de julio 2014'
     *
     * @example
     * // Escape string by single quote characters:
     * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
     * //=> "3 o'clock"
     */

    function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      requiredArgs(2, arguments);
      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale = options.locale || locale$1;
      var localeFirstWeekContainsDate = locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (!locale.localize) {
        throw new RangeError('locale must contain localize property');
      }

      if (!locale.formatLong) {
        throw new RangeError('locale must contain formatLong property');
      }

      var originalDate = toDate(dirtyDate);

      if (!isValid(originalDate)) {
        throw new RangeError('Invalid time value');
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


      var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
      var utcDate = subMilliseconds(originalDate, timezoneOffset);
      var formatterOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale,
        _originalDate: originalDate
      };
      var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale.formatLong, formatterOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp).map(function (substring) {
        // Replace two single quote characters with one single quote character
        if (substring === "''") {
          return "'";
        }

        var firstCharacter = substring[0];

        if (firstCharacter === "'") {
          return cleanEscapedString(substring);
        }

        var formatter = formatters[firstCharacter];

        if (formatter) {
          if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
            throwProtectedError(substring, dirtyFormatStr, dirtyDate);
          }

          return formatter(utcDate, substring, locale.localize, formatterOptions);
        }

        if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
          throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
        }

        return substring;
      }).join('');
      return result;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    /**
     * @name getDaysInMonth
     * @category Month Helpers
     * @summary Get the number of days in a month of the given date.
     *
     * @description
     * Get the number of days in a month of the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the given date
     * @returns {Number} the number of days in a month
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // How many days are in February 2000?
     * const result = getDaysInMonth(new Date(2000, 1))
     * //=> 29
     */

    function getDaysInMonth(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getFullYear();
      var monthIndex = date.getMonth();
      var lastDayOfMonth = new Date(0);
      lastDayOfMonth.setFullYear(year, monthIndex + 1, 0);
      lastDayOfMonth.setHours(0, 0, 0, 0);
      return lastDayOfMonth.getDate();
    }

    /**
     * @name getTime
     * @category Timestamp Helpers
     * @summary Get the milliseconds timestamp of the given date.
     *
     * @description
     * Get the milliseconds timestamp of the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the given date
     * @returns {Number} the timestamp
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Get the timestamp of 29 February 2012 11:45:05.123:
     * const result = getTime(new Date(2012, 1, 29, 11, 45, 5, 123))
     * //=> 1330515905123
     */

    function getTime(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      return timestamp;
    }

    /**
     * @name setMonth
     * @category Month Helpers
     * @summary Set the month to the given date.
     *
     * @description
     * Set the month to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} month - the month of the new date
     * @returns {Date} the new date with the month set
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Set February to 1 September 2014:
     * const result = setMonth(new Date(2014, 8, 1), 1)
     * //=> Sat Feb 01 2014 00:00:00
     */

    function setMonth(dirtyDate, dirtyMonth) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var month = toInteger(dirtyMonth);
      var year = date.getFullYear();
      var day = date.getDate();
      var dateWithDesiredMonth = new Date(0);
      dateWithDesiredMonth.setFullYear(year, month, 15);
      dateWithDesiredMonth.setHours(0, 0, 0, 0);
      var daysInMonth = getDaysInMonth(dateWithDesiredMonth); // Set the last day of the new month
      // if the original date was the last day of the longer month

      date.setMonth(month, Math.min(day, daysInMonth));
      return date;
    }

    /**
     * @name set
     * @category Common Helpers
     * @summary Set date values to a given date.
     *
     * @description
     * Set date values to a given date.
     *
     * Sets time values to date from object `values`.
     * A value is not set if it is undefined or null or doesn't exist in `values`.
     *
     * Note about bundle size: `set` does not internally use `setX` functions from date-fns but instead opts
     * to use native `Date#setX` methods. If you use this function, you may not want to include the
     * other `setX` functions that date-fns provides if you are concerned about the bundle size.
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Object} values - an object with options
     * @param {Number} [values.year] - the number of years to be set
     * @param {Number} [values.month] - the number of months to be set
     * @param {Number} [values.date] - the number of days to be set
     * @param {Number} [values.hours] - the number of hours to be set
     * @param {Number} [values.minutes] - the number of minutes to be set
     * @param {Number} [values.seconds] - the number of seconds to be set
     * @param {Number} [values.milliseconds] - the number of milliseconds to be set
     * @returns {Date} the new date with options set
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `values` must be an object
     *
     * @example
     * // Transform 1 September 2014 into 20 October 2015 in a single line:
     * var result = set(new Date(2014, 8, 20), { year: 2015, month: 9, date: 20 })
     * //=> Tue Oct 20 2015 00:00:00
     *
     * @example
     * // Set 12 PM to 1 September 2014 01:23:45 to 1 September 2014 12:00:00:
     * var result = set(new Date(2014, 8, 1, 1, 23, 45), { hours: 12 })
     * //=> Mon Sep 01 2014 12:23:45
     */
    function set(dirtyDate, values) {
      requiredArgs(2, arguments);

      if (typeof values !== 'object' || values === null) {
        throw new RangeError('values parameter must be an object');
      }

      var date = toDate(dirtyDate); // Check if date is Invalid Date because Date.prototype.setFullYear ignores the value of Invalid Date

      if (isNaN(date.getTime())) {
        return new Date(NaN);
      }

      if (values.year != null) {
        date.setFullYear(values.year);
      }

      if (values.month != null) {
        date = setMonth(date, values.month);
      }

      if (values.date != null) {
        date.setDate(toInteger(values.date));
      }

      if (values.hours != null) {
        date.setHours(toInteger(values.hours));
      }

      if (values.minutes != null) {
        date.setMinutes(toInteger(values.minutes));
      }

      if (values.seconds != null) {
        date.setSeconds(toInteger(values.seconds));
      }

      if (values.milliseconds != null) {
        date.setMilliseconds(toInteger(values.milliseconds));
      }

      return date;
    }

    var formatDistanceLocale = {
      lessThanXSeconds: {
        one: 'kurang dari 1 saat',
        other: 'kurang dari {{count}} saat'
      },
      xSeconds: {
        one: '1 saat',
        other: '{{count}} saat'
      },
      halfAMinute: 'setengah minit',
      lessThanXMinutes: {
        one: 'kurang dari 1 minit',
        other: 'kurang dari {{count}} minit'
      },
      xMinutes: {
        one: '1 minit',
        other: '{{count}} minit'
      },
      aboutXHours: {
        one: 'sekitar 1 jam',
        other: 'sekitar {{count}} jam'
      },
      xHours: {
        one: '1 jam',
        other: '{{count}} jam'
      },
      xDays: {
        one: '1 hari',
        other: '{{count}} hari'
      },
      aboutXWeeks: {
        one: 'sekitar 1 minggu',
        other: 'sekitar {{count}} minggu'
      },
      xWeeks: {
        one: '1 minggu',
        other: '{{count}} minggu'
      },
      aboutXMonths: {
        one: 'sekitar 1 bulan',
        other: 'sekitar {{count}} bulan'
      },
      xMonths: {
        one: '1 bulan',
        other: '{{count}} bulan'
      },
      aboutXYears: {
        one: 'sekitar 1 tahun',
        other: 'sekitar {{count}} tahun'
      },
      xYears: {
        one: '1 tahun',
        other: '{{count}} tahun'
      },
      overXYears: {
        one: 'lebih dari 1 tahun',
        other: 'lebih dari {{count}} tahun'
      },
      almostXYears: {
        one: 'hampir 1 tahun',
        other: 'hampir {{count}} tahun'
      }
    };
    function formatDistance(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale[token] === 'string') {
        result = formatDistanceLocale[token];
      } else if (count === 1) {
        result = formatDistanceLocale[token].one;
      } else {
        result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'dalam masa ' + result;
        } else {
          return result + ' yang lalu';
        }
      }

      return result;
    }

    var dateFormats = {
      full: 'EEEE, d MMMM yyyy',
      long: 'd MMMM yyyy',
      medium: 'd MMM yyyy',
      short: 'd/M/yyyy'
    };
    var timeFormats = {
      full: 'HH.mm.ss',
      long: 'HH.mm.ss',
      medium: 'HH.mm',
      short: 'HH.mm'
    };
    var dateTimeFormats = {
      full: "{{date}} 'pukul' {{time}}",
      long: "{{date}} 'pukul' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale = {
      lastWeek: "eeee 'lepas pada jam' p",
      yesterday: "'Semalam pada jam' p",
      today: "'Hari ini pada jam' p",
      tomorrow: "'Esok pada jam' p",
      nextWeek: "eeee 'pada jam' p",
      other: 'P'
    };
    function formatRelative(token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    }

    // https://www.unicode.org/cldr/charts/32/summary/ms.html

    var eraValues = {
      narrow: ['SM', 'M'],
      abbreviated: ['SM', 'M'],
      wide: ['Sebelum Masihi', 'Masihi']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['S1', 'S2', 'S3', 'S4'],
      wide: ['Suku pertama', 'Suku kedua', 'Suku ketiga', 'Suku keempat'] // Note: in Malay, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'O', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
      wide: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
    };
    var dayValues = {
      narrow: ['A', 'I', 'S', 'R', 'K', 'J', 'S'],
      short: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
      abbreviated: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
      wide: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']
    };
    var dayPeriodValues = {
      narrow: {
        am: 'am',
        pm: 'pm',
        midnight: 'tgh malam',
        noon: 'tgh hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'tengah malam',
        noon: 'tengah hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'tengah malam',
        noon: 'tengah hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'am',
        pm: 'pm',
        midnight: 'tengah malam',
        noon: 'tengah hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'tengah malam',
        noon: 'tengah hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'tengah malam',
        noon: 'tengah hari',
        morning: 'pagi',
        afternoon: 'tengah hari',
        evening: 'petang',
        night: 'malam'
      }
    };

    function ordinalNumber(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // Can't use "pertama", "kedua" because can't be parsed

      switch (number) {
        default:
          return 'ke-' + number;
      }
    }

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };

    var matchOrdinalNumberPattern = /^ke-(\d+)?/i;
    var parseOrdinalNumberPattern = /petama|\d+/i;
    var matchEraPatterns = {
      narrow: /^(sm|m)/i,
      abbreviated: /^(s\.?\s?m\.?|m\.?)/i,
      wide: /^(sebelum masihi|masihi)/i
    };
    var parseEraPatterns = {
      any: [/^s/i, /^(m)/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^S[1234]/i,
      wide: /Suku (pertama|kedua|ketiga|keempat)/i
    };
    var parseQuarterPatterns = {
      any: [/pertama|1/i, /kedua|2/i, /ketiga|3/i, /keempat|4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mac|apr|mei|jun|jul|ogo|sep|okt|nov|dis)/i,
      wide: /^(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^o/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^ma/i, /^ap/i, /^me/i, /^jun/i, /^jul/i, /^og/i, /^s/i, /^ok/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[aisrkj]/i,
      short: /^(ahd|isn|sel|rab|kha|jum|sab)/i,
      abbreviated: /^(ahd|isn|sel|rab|kha|jum|sab)/i,
      wide: /^(ahad|isnin|selasa|rabu|khamis|jumaat|sabtu)/i
    };
    var parseDayPatterns = {
      narrow: [/^a/i, /^i/i, /^s/i, /^r/i, /^k/i, /^j/i, /^s/i],
      any: [/^a/i, /^i/i, /^se/i, /^r/i, /^k/i, /^j/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(am|pm|tengah malam|tengah hari|pagi|petang|malam)/i,
      any: /^([ap]\.?\s?m\.?|tengah malam|tengah hari|pagi|petang|malam)/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^a/i,
        pm: /^pm/i,
        midnight: /^tengah m/i,
        noon: /^tengah h/i,
        morning: /pa/i,
        afternoon: /tengah h/i,
        evening: /pe/i,
        night: /m/i
      }
    };
    var match = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary Malay locale.
     * @language Malay
     * @iso-639-2 msa
     * @author Ruban Selvarajah [@Zyten]{@link https://github.com/Zyten}
     */

    var locale = {
      code: 'ms',
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match,
      options: {
        weekStartsOn: 1
        /* Monday */
        ,
        firstWeekContainsDate: 1
      }
    };

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const senaraiTarikh = writable([]);

    const tambah = (tarikh, newgest) => {
      const tnow = new Date();

      senaraiTarikh.update((values) => {
        if (values.length > 0) {
          const lastItem = values[values.length - 1];
          const lastItemDate = new Date(lastItem.id);
          const elapsed = differenceInMilliseconds(tnow, lastItemDate);
          if (elapsed > 10000) {
            // if more than 10 seconds, create
            const newobj = { id: getTime(tnow), masa: tarikh, gest: newgest };
            return [...values, newobj]
          } else {
            // if less than that, update the last one
            const index = values.findIndex((item) => item.id === lastItem.id);
            values[index].masa = tarikh;
            values[index].gest = newgest;
            return [...values]
          }
        } else {
          // for initialization when values is empty
          return [{ id: getTime(tnow), masa: tarikh, gest: newgest }]
        }
      });
    };

    const padam = (id) => {
      senaraiTarikh.update((senaraiAsal) => {
        return senaraiAsal.filter((item) => item.id !== id)
      });
    };

    const resetvalue = writable(false);

    /* src\MyCalendar.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$3 = "src\\MyCalendar.svelte";

    function create_fragment$3(ctx) {
    	let table;
    	let tbody;
    	let tr0;
    	let td0;
    	let t1;
    	let td1;
    	let input0;
    	let t2;
    	let tr1;
    	let td2;
    	let t4;
    	let td3;
    	let input1;
    	let t5;
    	let tr2;
    	let td4;
    	let t7;
    	let td5;
    	let t9;
    	let tr3;
    	let td6;
    	let t11;
    	let td7;
    	let t12_value = (/*gest*/ ctx[4].week ? /*gest*/ ctx[4].week : "0") + "";
    	let t12;
    	let t13;
    	let t14_value = (/*gest*/ ctx[4].week > 1 ? "weeks" : "week") + "";
    	let t14;
    	let t15;
    	let t16_value = (/*gest*/ ctx[4].days ? /*gest*/ ctx[4].days : "0") + "";
    	let t16;
    	let t17;
    	let t18_value = (/*gest*/ ctx[4].days > 1 ? "days" : "day") + "";
    	let t18;
    	let t19;
    	let tr4;
    	let td8;
    	let t21;
    	let td9;
    	let t22;
    	let t23;
    	let tr5;
    	let td10;
    	let t25;
    	let td11;
    	let t26;
    	let t27;
    	let tr6;
    	let td12;
    	let t29;
    	let td13;
    	let t30;
    	let t31;
    	let tr7;
    	let td14;
    	let t33;
    	let td15;
    	let t34;
    	let t35;
    	let tr8;
    	let td16;
    	let t37;
    	let td17;
    	let t38;
    	let t39;
    	let tr9;
    	let td18;
    	let span;
    	let input2;
    	let t40;
    	let input3;
    	let t41;
    	let t42;
    	let td19;
    	let input4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			table = element("table");
    			tbody = element("tbody");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "LMP:";
    			t1 = space();
    			td1 = element("td");
    			input0 = element("input");
    			t2 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "EDD:";
    			t4 = space();
    			td3 = element("td");
    			input1 = element("input");
    			t5 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "Today is";
    			t7 = space();
    			td5 = element("td");
    			td5.textContent = `${format(/*today*/ ctx[11], "d/M/yy h:mm b")}`;
    			t9 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "Gestation:";
    			t11 = space();
    			td7 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			t14 = text(t14_value);
    			t15 = space();
    			t16 = text(t16_value);
    			t17 = space();
    			t18 = text(t18_value);
    			t19 = space();
    			tr4 = element("tr");
    			td8 = element("td");
    			td8.textContent = "14+0 weeks:";
    			t21 = space();
    			td9 = element("td");
    			t22 = text(/*week14*/ ctx[5]);
    			t23 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = "20 weeks:";
    			t25 = space();
    			td11 = element("td");
    			t26 = text(/*week20*/ ctx[6]);
    			t27 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "30 weeks:";
    			t29 = space();
    			td13 = element("td");
    			t30 = text(/*week30*/ ctx[7]);
    			t31 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			td14.textContent = "33+0 weeks:";
    			t33 = space();
    			td15 = element("td");
    			t34 = text(/*week33*/ ctx[8]);
    			t35 = space();
    			tr8 = element("tr");
    			td16 = element("td");
    			td16.textContent = "38 weeks:";
    			t37 = space();
    			td17 = element("td");
    			t38 = text(/*week38*/ ctx[9]);
    			t39 = space();
    			tr9 = element("tr");
    			td18 = element("td");
    			span = element("span");
    			input2 = element("input");
    			t40 = text("\r\n          W\r\n          ");
    			input3 = element("input");
    			t41 = text("\r\n          D:");
    			t42 = space();
    			td19 = element("td");
    			input4 = element("input");
    			add_location(td0, file$3, 116, 6, 2966);
    			attr_dev(input0, "type", "date");
    			input0.value = /*start*/ ctx[2];
    			attr_dev(input0, "max", "9999-12-31");
    			add_location(input0, file$3, 118, 8, 3001);
    			add_location(td1, file$3, 117, 6, 2987);
    			attr_dev(tr0, "id", "lmp");
    			attr_dev(tr0, "class", "bg-pink-400");
    			add_location(tr0, file$3, 115, 4, 2925);
    			add_location(td2, file$3, 128, 6, 3200);
    			attr_dev(input1, "type", "date");
    			input1.value = /*endDate*/ ctx[3];
    			attr_dev(input1, "max", "9999-12-31");
    			add_location(input1, file$3, 130, 8, 3235);
    			add_location(td3, file$3, 129, 6, 3221);
    			attr_dev(tr1, "id", "edd");
    			attr_dev(tr1, "class", "bg-pink-500");
    			add_location(tr1, file$3, 127, 4, 3159);
    			add_location(td4, file$3, 140, 6, 3464);
    			add_location(td5, file$3, 141, 6, 3489);
    			attr_dev(tr2, "id", "today");
    			attr_dev(tr2, "class", "uppercase font-medium tracking-wider");
    			add_location(tr2, file$3, 139, 4, 3396);
    			add_location(td6, file$3, 145, 6, 3607);
    			attr_dev(td7, "id", "gestval");
    			add_location(td7, file$3, 146, 6, 3634);
    			attr_dev(tr3, "id", "gest");
    			attr_dev(tr3, "class", "bg-indigo-300 font-semibold");
    			add_location(tr3, file$3, 144, 4, 3549);
    			add_location(td8, file$3, 154, 6, 3876);
    			add_location(td9, file$3, 155, 6, 3904);
    			attr_dev(tr4, "class", "font-light");
    			add_location(tr4, file$3, 153, 4, 3845);
    			add_location(td10, file$3, 158, 6, 3969);
    			add_location(td11, file$3, 159, 6, 3995);
    			attr_dev(tr5, "class", "font-light");
    			add_location(tr5, file$3, 157, 4, 3938);
    			add_location(td12, file$3, 162, 6, 4060);
    			add_location(td13, file$3, 163, 6, 4086);
    			attr_dev(tr6, "class", "font-light");
    			add_location(tr6, file$3, 161, 4, 4029);
    			add_location(td14, file$3, 166, 6, 4151);
    			add_location(td15, file$3, 167, 6, 4179);
    			attr_dev(tr7, "class", "font-light");
    			add_location(tr7, file$3, 165, 4, 4120);
    			add_location(td16, file$3, 170, 6, 4245);
    			add_location(td17, file$3, 171, 6, 4271);
    			attr_dev(tr8, "class", "font-normal");
    			add_location(tr8, file$3, 169, 4, 4213);
    			attr_dev(input2, "type", "number");
    			set_style(input2, "width", "2em");
    			add_location(input2, file$3, 176, 10, 4382);
    			attr_dev(input3, "type", "number");
    			set_style(input3, "width", "2em");
    			add_location(input3, file$3, 178, 10, 4472);
    			add_location(span, file$3, 175, 8, 4364);
    			add_location(td18, file$3, 174, 6, 4350);
    			attr_dev(input4, "type", "date");
    			input4.value = /*searchDate*/ ctx[10];
    			attr_dev(input4, "max", "9999-12-31");
    			add_location(input4, file$3, 184, 8, 4641);
    			add_location(td19, file$3, 183, 6, 4627);
    			attr_dev(tr9, "id", "weday");
    			attr_dev(tr9, "class", "bg-purple-400");
    			add_location(tr9, file$3, 173, 4, 4305);
    			add_location(tbody, file$3, 114, 2, 2912);
    			attr_dev(table, "class", "table-auto w-full");
    			add_location(table, file$3, 113, 0, 2875);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t1);
    			append_dev(tr0, td1);
    			append_dev(td1, input0);
    			append_dev(tbody, t2);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, t4);
    			append_dev(tr1, td3);
    			append_dev(td3, input1);
    			append_dev(tbody, t5);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t7);
    			append_dev(tr2, td5);
    			append_dev(tbody, t9);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, t11);
    			append_dev(tr3, td7);
    			append_dev(td7, t12);
    			append_dev(td7, t13);
    			append_dev(td7, t14);
    			append_dev(td7, t15);
    			append_dev(td7, t16);
    			append_dev(td7, t17);
    			append_dev(td7, t18);
    			append_dev(tbody, t19);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td8);
    			append_dev(tr4, t21);
    			append_dev(tr4, td9);
    			append_dev(td9, t22);
    			append_dev(tbody, t23);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, t25);
    			append_dev(tr5, td11);
    			append_dev(td11, t26);
    			append_dev(tbody, t27);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, t29);
    			append_dev(tr6, td13);
    			append_dev(td13, t30);
    			append_dev(tbody, t31);
    			append_dev(tbody, tr7);
    			append_dev(tr7, td14);
    			append_dev(tr7, t33);
    			append_dev(tr7, td15);
    			append_dev(td15, t34);
    			append_dev(tbody, t35);
    			append_dev(tbody, tr8);
    			append_dev(tr8, td16);
    			append_dev(tr8, t37);
    			append_dev(tr8, td17);
    			append_dev(td17, t38);
    			append_dev(tbody, t39);
    			append_dev(tbody, tr9);
    			append_dev(tr9, td18);
    			append_dev(td18, span);
    			append_dev(span, input2);
    			set_input_value(input2, /*givenWeeks*/ ctx[0]);
    			append_dev(span, t40);
    			append_dev(span, input3);
    			set_input_value(input3, /*givenDays*/ ctx[1]);
    			append_dev(span, t41);
    			append_dev(tr9, t42);
    			append_dev(tr9, td19);
    			append_dev(td19, input4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*handleLMP*/ ctx[12], false, false, false),
    					listen_dev(input1, "change", /*handleEDD*/ ctx[13], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[19]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[20]),
    					listen_dev(input4, "change", /*handleSearchDate*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*start*/ 4) {
    				prop_dev(input0, "value", /*start*/ ctx[2]);
    			}

    			if (dirty & /*endDate*/ 8) {
    				prop_dev(input1, "value", /*endDate*/ ctx[3]);
    			}

    			if (dirty & /*gest*/ 16 && t12_value !== (t12_value = (/*gest*/ ctx[4].week ? /*gest*/ ctx[4].week : "0") + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*gest*/ 16 && t14_value !== (t14_value = (/*gest*/ ctx[4].week > 1 ? "weeks" : "week") + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*gest*/ 16 && t16_value !== (t16_value = (/*gest*/ ctx[4].days ? /*gest*/ ctx[4].days : "0") + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*gest*/ 16 && t18_value !== (t18_value = (/*gest*/ ctx[4].days > 1 ? "days" : "day") + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*week14*/ 32) set_data_dev(t22, /*week14*/ ctx[5]);
    			if (dirty & /*week20*/ 64) set_data_dev(t26, /*week20*/ ctx[6]);
    			if (dirty & /*week30*/ 128) set_data_dev(t30, /*week30*/ ctx[7]);
    			if (dirty & /*week33*/ 256) set_data_dev(t34, /*week33*/ ctx[8]);
    			if (dirty & /*week38*/ 512) set_data_dev(t38, /*week38*/ ctx[9]);

    			if (dirty & /*givenWeeks*/ 1 && to_number(input2.value) !== /*givenWeeks*/ ctx[0]) {
    				set_input_value(input2, /*givenWeeks*/ ctx[0]);
    			}

    			if (dirty & /*givenDays*/ 2 && to_number(input3.value) !== /*givenDays*/ ctx[1]) {
    				set_input_value(input3, /*givenDays*/ ctx[1]);
    			}

    			if (dirty & /*searchDate*/ 1024) {
    				prop_dev(input4, "value", /*searchDate*/ ctx[10]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function pad(x, len) {
    	x = String(x);
    	while (x.length < len) x = `0${x}`;
    	return x;
    }

    function isNotValid(arr) {
    	return arr.length === 1 || parseInt(arr[0]) < 1000 || parseInt(arr[0]) > 3000;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let start;
    	let endDate;
    	let gest;
    	let week14;
    	let week20;
    	let week30;
    	let week33;
    	let week38;
    	let countedDate;
    	let searchDate;
    	let $resetvalue;
    	validate_store(resetvalue, "resetvalue");
    	component_subscribe($$self, resetvalue, $$value => $$invalidate(18, $resetvalue = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MyCalendar", slots, []);
    	let lmp = new Date();
    	let edd = addDays(lmp, 280);
    	let rightDate = new Date();
    	let givenWeeks = 0;
    	let givenDays = 0;
    	let today = new Date();

    	function toStr(date) {
    		try {
    			return format(date, "d-MMM-yyyy");
    		} catch(error) {
    			console.log(error.message);
    			return "-";
    		}
    	}

    	function handleLMP(event) {
    		let arr = event.target.value.split("-");
    		if (isNotValid(arr)) return;

    		$$invalidate(15, lmp = set(new Date(), {
    			year: arr[0],
    			month: arr[1] - 1,
    			date: arr[2]
    		}));

    		$$invalidate(16, edd = addDays(lmp, 280));
    	}

    	function handleEDD(event) {
    		let arr = event.target.value.split("-");
    		if (isNotValid(arr)) return;

    		$$invalidate(16, edd = set(new Date(), {
    			year: arr[0],
    			month: arr[1] - 1,
    			date: arr[2]
    		}));

    		$$invalidate(15, lmp = addDays(edd, -280));
    	}

    	function difference(firstDate, secondDate) {
    		let daysDif = differenceInCalendarDays(firstDate, secondDate);

    		let newgest = {
    			week: Math.floor(daysDif / 7),
    			days: daysDif % 7
    		};

    		tambah(format(lmp, "d-MMM-yyyy HH:mm"), newgest);
    		return newgest;
    	}

    	function calculateDate(w, d) {
    		let days = w * 7 + d;
    		return addDays(lmp, days);
    	}

    	function handlereset(resetvalue) {
    		$$invalidate(15, lmp = new Date());
    		$$invalidate(0, givenWeeks = 0);
    		$$invalidate(1, givenDays = 0);
    		$$invalidate(10, searchDate = format(lmp, "yyyy-MM-dd"));
    		$$invalidate(2, start = searchDate);
    	}

    	function handleSearchDate(event) {
    		let arr = event.target.value.split("-");
    		if (isNotValid(arr)) return;

    		let adate = set(new Date(), {
    			year: arr[0],
    			month: arr[1] - 1,
    			date: arr[2]
    		});

    		let newgest = difference(adate, lmp);
    		$$invalidate(0, givenWeeks = newgest.week);
    		$$invalidate(1, givenDays = newgest.days);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<MyCalendar> was created with unknown prop '${key}'`);
    	});

    	function input2_input_handler() {
    		givenWeeks = to_number(this.value);
    		$$invalidate(0, givenWeeks);
    	}

    	function input3_input_handler() {
    		givenDays = to_number(this.value);
    		$$invalidate(1, givenDays);
    	}

    	$$self.$capture_state = () => ({
    		format,
    		addDays,
    		set,
    		differenceInCalendarDays,
    		isValid,
    		ms: locale,
    		tambah,
    		resetvalue,
    		lmp,
    		edd,
    		rightDate,
    		givenWeeks,
    		givenDays,
    		today,
    		toStr,
    		pad,
    		handleLMP,
    		handleEDD,
    		isNotValid,
    		difference,
    		calculateDate,
    		handlereset,
    		handleSearchDate,
    		start,
    		endDate,
    		gest,
    		week14,
    		week20,
    		week30,
    		week33,
    		week38,
    		countedDate,
    		$resetvalue,
    		searchDate
    	});

    	$$self.$inject_state = $$props => {
    		if ("lmp" in $$props) $$invalidate(15, lmp = $$props.lmp);
    		if ("edd" in $$props) $$invalidate(16, edd = $$props.edd);
    		if ("rightDate" in $$props) $$invalidate(21, rightDate = $$props.rightDate);
    		if ("givenWeeks" in $$props) $$invalidate(0, givenWeeks = $$props.givenWeeks);
    		if ("givenDays" in $$props) $$invalidate(1, givenDays = $$props.givenDays);
    		if ("today" in $$props) $$invalidate(11, today = $$props.today);
    		if ("start" in $$props) $$invalidate(2, start = $$props.start);
    		if ("endDate" in $$props) $$invalidate(3, endDate = $$props.endDate);
    		if ("gest" in $$props) $$invalidate(4, gest = $$props.gest);
    		if ("week14" in $$props) $$invalidate(5, week14 = $$props.week14);
    		if ("week20" in $$props) $$invalidate(6, week20 = $$props.week20);
    		if ("week30" in $$props) $$invalidate(7, week30 = $$props.week30);
    		if ("week33" in $$props) $$invalidate(8, week33 = $$props.week33);
    		if ("week38" in $$props) $$invalidate(9, week38 = $$props.week38);
    		if ("countedDate" in $$props) $$invalidate(17, countedDate = $$props.countedDate);
    		if ("searchDate" in $$props) $$invalidate(10, searchDate = $$props.searchDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(2, start = [lmp.getFullYear(), pad(lmp.getMonth() + 1, 2), pad(lmp.getDate(), 2)].join("-"));
    		}

    		if ($$self.$$.dirty & /*edd*/ 65536) {
    			$$invalidate(3, endDate = [edd.getFullYear(), pad(edd.getMonth() + 1, 2), pad(edd.getDate(), 2)].join("-"));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(4, gest = difference(rightDate, lmp));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(5, week14 = toStr(addDays(lmp, 98)));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(6, week20 = toStr(addDays(lmp, 140)));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(7, week30 = toStr(addDays(lmp, 210)));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(8, week33 = toStr(addDays(lmp, 231)));
    		}

    		if ($$self.$$.dirty & /*lmp*/ 32768) {
    			$$invalidate(9, week38 = format(addDays(lmp, 266), "d-MMM-yyyy E"));
    		}

    		if ($$self.$$.dirty & /*givenWeeks, givenDays*/ 3) {
    			$$invalidate(17, countedDate = calculateDate(givenWeeks, givenDays));
    		}

    		if ($$self.$$.dirty & /*$resetvalue*/ 262144) {
    			handlereset();
    		}

    		if ($$self.$$.dirty & /*countedDate*/ 131072) {
    			$$invalidate(10, searchDate = isValid(countedDate)
    			? format(countedDate, "yyyy-MM-dd")
    			: format(new Date(), "yyyy-MM-dd"));
    		}
    	};

    	return [
    		givenWeeks,
    		givenDays,
    		start,
    		endDate,
    		gest,
    		week14,
    		week20,
    		week30,
    		week33,
    		week38,
    		searchDate,
    		today,
    		handleLMP,
    		handleEDD,
    		handleSearchDate,
    		lmp,
    		edd,
    		countedDate,
    		$resetvalue,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class MyCalendar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MyCalendar",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\LisTarikh.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\LisTarikh.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i].id;
    	child_ctx[5] = list[i].masa;
    	child_ctx[6] = list[i].gest;
    	return child_ctx;
    }

    // (23:0) {#if senaraiPesakit.length !== 0}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*senaraiPesakit*/ ctx[0].length + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Bilangan kiraan: ");
    			t1 = text(t1_value);
    			add_location(p, file$2, 23, 2, 415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*senaraiPesakit*/ 1 && t1_value !== (t1_value = /*senaraiPesakit*/ ctx[0].length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(23:0) {#if senaraiPesakit.length !== 0}",
    		ctx
    	});

    	return block;
    }

    // (36:2) {:else}
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Selamat Bertugas";
    			add_location(div, file$2, 36, 4, 847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(36:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:2) {#each senaraiPesakit as { id, masa, gest }}
    function create_each_block(ctx) {
    	let li;
    	let button;
    	let t0_value = /*masa*/ ctx[5].slice(-5) + "";
    	let t0;
    	let t1;
    	let div;
    	let t2;
    	let t3_value = /*masa*/ ctx[5].slice(0, -5) + "";
    	let t3;
    	let t4;
    	let t5_value = /*gest*/ ctx[6].week + "";
    	let t5;
    	let t6;
    	let t7_value = /*gest*/ ctx[6].days + "";
    	let t7;
    	let t8;
    	let t9;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*id*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			div = element("div");
    			t2 = text("LMP: ");
    			t3 = text(t3_value);
    			t4 = text(" POA: ");
    			t5 = text(t5_value);
    			t6 = text("+");
    			t7 = text(t7_value);
    			t8 = text("/7");
    			t9 = space();
    			attr_dev(button, "class", "bg-purple-400 hover:bg-purple-600 text-white px-1 py-0  svelte-6js410");
    			add_location(button, file$2, 28, 6, 585);
    			add_location(div, file$2, 33, 6, 753);
    			attr_dev(li, "class", "py-1 flex justify-between mt-1 px-1 svelte-6js410");
    			add_location(li, file$2, 27, 4, 529);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, t0);
    			append_dev(li, t1);
    			append_dev(li, div);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			append_dev(div, t5);
    			append_dev(div, t6);
    			append_dev(div, t7);
    			append_dev(div, t8);
    			append_dev(li, t9);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*senaraiPesakit*/ 1 && t0_value !== (t0_value = /*masa*/ ctx[5].slice(-5) + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*senaraiPesakit*/ 1 && t3_value !== (t3_value = /*masa*/ ctx[5].slice(0, -5) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*senaraiPesakit*/ 1 && t5_value !== (t5_value = /*gest*/ ctx[6].week + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*senaraiPesakit*/ 1 && t7_value !== (t7_value = /*gest*/ ctx[6].days + "")) set_data_dev(t7, t7_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(27:2) {#each senaraiPesakit as { id, masa, gest }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let p;
    	let t2;
    	let t3;
    	let ol;
    	let if_block = /*senaraiPesakit*/ ctx[0].length !== 0 && create_if_block(ctx);
    	let each_value = /*senaraiPesakit*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `Klinik mula: ${/*masaMasuk*/ ctx[1].masa}`;
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			add_location(p, file$2, 21, 0, 340);
    			add_location(ol, file$2, 25, 0, 471);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ol, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ol, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(ol, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*senaraiPesakit*/ ctx[0].length !== 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(t3.parentNode, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*senaraiPesakit, padam*/ 1) {
    				each_value = /*senaraiPesakit*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ol, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					each_1_else.m(ol, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t2);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(ol);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let senaraiPesakit;
    	let $storTarikh;
    	validate_store(senaraiTarikh, "storTarikh");
    	component_subscribe($$self, senaraiTarikh, $$value => $$invalidate(2, $storTarikh = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("LisTarikh", slots, []);
    	let masaMasuk = $storTarikh[0];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LisTarikh> was created with unknown prop '${key}'`);
    	});

    	const click_handler = id => padam(id);

    	$$self.$capture_state = () => ({
    		storTarikh: senaraiTarikh,
    		padam,
    		get_store_value,
    		masaMasuk,
    		$storTarikh,
    		senaraiPesakit
    	});

    	$$self.$inject_state = $$props => {
    		if ("masaMasuk" in $$props) $$invalidate(1, masaMasuk = $$props.masaMasuk);
    		if ("senaraiPesakit" in $$props) $$invalidate(0, senaraiPesakit = $$props.senaraiPesakit);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$storTarikh*/ 4) {
    			$$invalidate(0, senaraiPesakit = $storTarikh.slice(1));
    		}
    	};

    	return [senaraiPesakit, masaMasuk, $storTarikh, click_handler];
    }

    class LisTarikh extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LisTarikh",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\BMI.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\components\\BMI.svelte";

    function create_fragment$1(ctx) {
    	let div26;
    	let div0;
    	let t1;
    	let div25;
    	let div3;
    	let span0;
    	let t3;
    	let div2;
    	let div1;
    	let input0;
    	let t4;
    	let span1;
    	let t6;
    	let div5;
    	let span2;
    	let t8;
    	let div4;
    	let input1;
    	let t9;
    	let span3;
    	let t11;
    	let div24;
    	let div8;
    	let div6;
    	let t13;
    	let div7;

    	let t14_value = (/*currentbmi*/ ctx[2]
    	? /*currentbmi*/ ctx[2].toFixed(1)
    	: 0) + "";

    	let t14;
    	let t15;
    	let div11;
    	let div9;
    	let t17;
    	let div10;
    	let t18_value = /*minnormwt*/ ctx[3].toFixed(1) + "";
    	let t18;
    	let t19;
    	let t20_value = /*maxnorwt*/ ctx[4].toFixed(1) + "";
    	let t20;
    	let t21;
    	let div14;
    	let div12;
    	let t23;
    	let div13;
    	let t24_value = /*minoverwt*/ ctx[5].toFixed(1) + "";
    	let t24;
    	let t25;
    	let t26_value = /*maxoverwt*/ ctx[6].toFixed(1) + "";
    	let t26;
    	let t27;
    	let div17;
    	let div15;
    	let t29;
    	let div16;
    	let t30_value = /*minobese1*/ ctx[7].toFixed(1) + "";
    	let t30;
    	let t31;
    	let t32_value = /*maxobese1*/ ctx[8].toFixed(1) + "";
    	let t32;
    	let t33;
    	let div20;
    	let div18;
    	let t35;
    	let div19;
    	let t36_value = /*minobese2*/ ctx[9].toFixed(1) + "";
    	let t36;
    	let t37;
    	let t38_value = /*maxobese2*/ ctx[10].toFixed(1) + "";
    	let t38;
    	let t39;
    	let div23;
    	let div21;
    	let t41;
    	let div22;
    	let t42_value = /*minobese3*/ ctx[11].toFixed(1) + "";
    	let t42;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div26 = element("div");
    			div0 = element("div");
    			div0.textContent = "BMI measurements";
    			t1 = space();
    			div25 = element("div");
    			div3 = element("div");
    			span0 = element("span");
    			span0.textContent = "Weight";
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			input0 = element("input");
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "kg";
    			t6 = space();
    			div5 = element("div");
    			span2 = element("span");
    			span2.textContent = "Height";
    			t8 = space();
    			div4 = element("div");
    			input1 = element("input");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "cm";
    			t11 = space();
    			div24 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = "Current BMI :";
    			t13 = space();
    			div7 = element("div");
    			t14 = text(t14_value);
    			t15 = space();
    			div11 = element("div");
    			div9 = element("div");
    			div9.textContent = "Normal BMI 17-24.9 :";
    			t17 = space();
    			div10 = element("div");
    			t18 = text(t18_value);
    			t19 = text("-");
    			t20 = text(t20_value);
    			t21 = space();
    			div14 = element("div");
    			div12 = element("div");
    			div12.textContent = "Overwt BMI 25-29.9 :";
    			t23 = space();
    			div13 = element("div");
    			t24 = text(t24_value);
    			t25 = text("-");
    			t26 = text(t26_value);
    			t27 = space();
    			div17 = element("div");
    			div15 = element("div");
    			div15.textContent = "Obese BMI 30-34.9 :";
    			t29 = space();
    			div16 = element("div");
    			t30 = text(t30_value);
    			t31 = text("-");
    			t32 = text(t32_value);
    			t33 = space();
    			div20 = element("div");
    			div18 = element("div");
    			div18.textContent = "Obese BMI 35-39.9 :";
    			t35 = space();
    			div19 = element("div");
    			t36 = text(t36_value);
    			t37 = text("-");
    			t38 = text(t38_value);
    			t39 = space();
    			div23 = element("div");
    			div21 = element("div");
    			div21.textContent = "Obese BMI 40 :";
    			t41 = space();
    			div22 = element("div");
    			t42 = text(t42_value);
    			attr_dev(div0, "class", "flex bg-purple-500 mt-1 p-2 uppercase text-center tracking-wide\r\n    border-2 border-purple-300 rounded ");
    			add_location(div0, file$1, 16, 2, 559);
    			add_location(span0, file$1, 25, 6, 805);
    			attr_dev(input0, "id", "weight");
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "1000");
    			add_location(input0, file$1, 28, 10, 877);
    			add_location(span1, file$1, 29, 10, 959);
    			add_location(div1, file$1, 27, 8, 860);
    			attr_dev(div2, "class", "my-1");
    			add_location(div2, file$1, 26, 6, 832);
    			attr_dev(div3, "class", "px-2 bg-pink-400 flex justify-around");
    			add_location(div3, file$1, 24, 4, 747);
    			add_location(span2, file$1, 34, 6, 1080);
    			attr_dev(input1, "id", "height");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "1000");
    			add_location(input1, file$1, 36, 8, 1135);
    			add_location(span3, file$1, 37, 8, 1215);
    			attr_dev(div4, "class", "my-1");
    			add_location(div4, file$1, 35, 6, 1107);
    			attr_dev(div5, "class", "px-2 bg-pink-500 flex justify-around");
    			add_location(div5, file$1, 33, 4, 1022);
    			add_location(div6, file$1, 43, 8, 1329);
    			add_location(div7, file$1, 44, 8, 1363);
    			attr_dev(div8, "class", "bmirow mt-6");
    			add_location(div8, file$1, 42, 6, 1294);
    			add_location(div9, file$1, 47, 8, 1471);
    			add_location(div10, file$1, 48, 8, 1512);
    			attr_dev(div11, "class", "bmirow mt-4");
    			add_location(div11, file$1, 46, 6, 1436);
    			add_location(div12, file$1, 51, 8, 1624);
    			add_location(div13, file$1, 52, 8, 1665);
    			attr_dev(div14, "class", "bmirow mt-1");
    			add_location(div14, file$1, 50, 6, 1589);
    			add_location(div15, file$1, 55, 8, 1778);
    			add_location(div16, file$1, 56, 8, 1818);
    			attr_dev(div17, "class", "bmirow mt-1");
    			add_location(div17, file$1, 54, 6, 1743);
    			add_location(div18, file$1, 59, 8, 1931);
    			add_location(div19, file$1, 60, 8, 1971);
    			attr_dev(div20, "class", "bmirow mt-1");
    			add_location(div20, file$1, 58, 6, 1896);
    			add_location(div21, file$1, 63, 8, 2084);
    			add_location(div22, file$1, 64, 8, 2119);
    			attr_dev(div23, "class", "bmirow mt-1");
    			add_location(div23, file$1, 62, 6, 2049);
    			attr_dev(div24, "class", "flex-col");
    			add_location(div24, file$1, 41, 4, 1264);
    			attr_dev(div25, "class", "p-2");
    			add_location(div25, file$1, 23, 2, 724);
    			attr_dev(div26, "class", "bg-purple-300 m-2 shadow-2xl rounded-lg");
    			add_location(div26, file$1, 15, 0, 502);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div26, anchor);
    			append_dev(div26, div0);
    			append_dev(div26, t1);
    			append_dev(div26, div25);
    			append_dev(div25, div3);
    			append_dev(div3, span0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*wt*/ ctx[0]);
    			append_dev(div1, t4);
    			append_dev(div1, span1);
    			append_dev(div25, t6);
    			append_dev(div25, div5);
    			append_dev(div5, span2);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, input1);
    			set_input_value(input1, /*ht*/ ctx[1]);
    			append_dev(div4, t9);
    			append_dev(div4, span3);
    			append_dev(div25, t11);
    			append_dev(div25, div24);
    			append_dev(div24, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div7, t14);
    			append_dev(div24, t15);
    			append_dev(div24, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t17);
    			append_dev(div11, div10);
    			append_dev(div10, t18);
    			append_dev(div10, t19);
    			append_dev(div10, t20);
    			append_dev(div24, t21);
    			append_dev(div24, div14);
    			append_dev(div14, div12);
    			append_dev(div14, t23);
    			append_dev(div14, div13);
    			append_dev(div13, t24);
    			append_dev(div13, t25);
    			append_dev(div13, t26);
    			append_dev(div24, t27);
    			append_dev(div24, div17);
    			append_dev(div17, div15);
    			append_dev(div17, t29);
    			append_dev(div17, div16);
    			append_dev(div16, t30);
    			append_dev(div16, t31);
    			append_dev(div16, t32);
    			append_dev(div24, t33);
    			append_dev(div24, div20);
    			append_dev(div20, div18);
    			append_dev(div20, t35);
    			append_dev(div20, div19);
    			append_dev(div19, t36);
    			append_dev(div19, t37);
    			append_dev(div19, t38);
    			append_dev(div24, t39);
    			append_dev(div24, div23);
    			append_dev(div23, div21);
    			append_dev(div23, t41);
    			append_dev(div23, div22);
    			append_dev(div22, t42);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[12]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wt*/ 1 && to_number(input0.value) !== /*wt*/ ctx[0]) {
    				set_input_value(input0, /*wt*/ ctx[0]);
    			}

    			if (dirty & /*ht*/ 2 && to_number(input1.value) !== /*ht*/ ctx[1]) {
    				set_input_value(input1, /*ht*/ ctx[1]);
    			}

    			if (dirty & /*currentbmi*/ 4 && t14_value !== (t14_value = (/*currentbmi*/ ctx[2]
    			? /*currentbmi*/ ctx[2].toFixed(1)
    			: 0) + "")) set_data_dev(t14, t14_value);

    			if (dirty & /*minnormwt*/ 8 && t18_value !== (t18_value = /*minnormwt*/ ctx[3].toFixed(1) + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*maxnorwt*/ 16 && t20_value !== (t20_value = /*maxnorwt*/ ctx[4].toFixed(1) + "")) set_data_dev(t20, t20_value);
    			if (dirty & /*minoverwt*/ 32 && t24_value !== (t24_value = /*minoverwt*/ ctx[5].toFixed(1) + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*maxoverwt*/ 64 && t26_value !== (t26_value = /*maxoverwt*/ ctx[6].toFixed(1) + "")) set_data_dev(t26, t26_value);
    			if (dirty & /*minobese1*/ 128 && t30_value !== (t30_value = /*minobese1*/ ctx[7].toFixed(1) + "")) set_data_dev(t30, t30_value);
    			if (dirty & /*maxobese1*/ 256 && t32_value !== (t32_value = /*maxobese1*/ ctx[8].toFixed(1) + "")) set_data_dev(t32, t32_value);
    			if (dirty & /*minobese2*/ 512 && t36_value !== (t36_value = /*minobese2*/ ctx[9].toFixed(1) + "")) set_data_dev(t36, t36_value);
    			if (dirty & /*maxobese2*/ 1024 && t38_value !== (t38_value = /*maxobese2*/ ctx[10].toFixed(1) + "")) set_data_dev(t38, t38_value);
    			if (dirty & /*minobese3*/ 2048 && t42_value !== (t42_value = /*minobese3*/ ctx[11].toFixed(1) + "")) set_data_dev(t42, t42_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div26);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let currentbmi;
    	let minnormwt;
    	let maxnorwt;
    	let minoverwt;
    	let maxoverwt;
    	let minobese1;
    	let maxobese1;
    	let minobese2;
    	let maxobese2;
    	let minobese3;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BMI", slots, []);
    	let wt = 50;
    	let ht = 150;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BMI> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		wt = to_number(this.value);
    		$$invalidate(0, wt);
    	}

    	function input1_input_handler() {
    		ht = to_number(this.value);
    		$$invalidate(1, ht);
    	}

    	$$self.$capture_state = () => ({
    		wt,
    		ht,
    		currentbmi,
    		minnormwt,
    		maxnorwt,
    		minoverwt,
    		maxoverwt,
    		minobese1,
    		maxobese1,
    		minobese2,
    		maxobese2,
    		minobese3
    	});

    	$$self.$inject_state = $$props => {
    		if ("wt" in $$props) $$invalidate(0, wt = $$props.wt);
    		if ("ht" in $$props) $$invalidate(1, ht = $$props.ht);
    		if ("currentbmi" in $$props) $$invalidate(2, currentbmi = $$props.currentbmi);
    		if ("minnormwt" in $$props) $$invalidate(3, minnormwt = $$props.minnormwt);
    		if ("maxnorwt" in $$props) $$invalidate(4, maxnorwt = $$props.maxnorwt);
    		if ("minoverwt" in $$props) $$invalidate(5, minoverwt = $$props.minoverwt);
    		if ("maxoverwt" in $$props) $$invalidate(6, maxoverwt = $$props.maxoverwt);
    		if ("minobese1" in $$props) $$invalidate(7, minobese1 = $$props.minobese1);
    		if ("maxobese1" in $$props) $$invalidate(8, maxobese1 = $$props.maxobese1);
    		if ("minobese2" in $$props) $$invalidate(9, minobese2 = $$props.minobese2);
    		if ("maxobese2" in $$props) $$invalidate(10, maxobese2 = $$props.maxobese2);
    		if ("minobese3" in $$props) $$invalidate(11, minobese3 = $$props.minobese3);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*wt, ht*/ 3) {
    			$$invalidate(2, currentbmi = wt / ht / ht * 10000);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(3, minnormwt = ht * ht / 10000 * 17);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(4, maxnorwt = ht * ht / 10000 * 24.9);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(5, minoverwt = ht * ht / 10000 * 25);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(6, maxoverwt = ht * ht / 10000 * 29.9);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(7, minobese1 = ht * ht / 10000 * 30);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(8, maxobese1 = ht * ht / 10000 * 34.9);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(9, minobese2 = ht * ht / 10000 * 35);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(10, maxobese2 = ht * ht / 10000 * 39.9);
    		}

    		if ($$self.$$.dirty & /*ht*/ 2) {
    			$$invalidate(11, minobese3 = ht * ht / 10000 * 40);
    		}
    	};

    	return [
    		wt,
    		ht,
    		currentbmi,
    		minnormwt,
    		maxnorwt,
    		minoverwt,
    		maxoverwt,
    		minobese1,
    		maxobese1,
    		minobese2,
    		maxobese2,
    		minobese3,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class BMI extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BMI",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button;
    	let t3;
    	let div3;
    	let mycalendar;
    	let t4;
    	let div5;
    	let weightsection;
    	let t5;
    	let div6;
    	let listtarikh;
    	let current;
    	let mounted;
    	let dispose;
    	mycalendar = new MyCalendar({ $$inline: true });
    	weightsection = new BMI({ $$inline: true });
    	listtarikh = new LisTarikh({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Obstetric Calendar";
    			t1 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Reset";
    			t3 = space();
    			div3 = element("div");
    			create_component(mycalendar.$$.fragment);
    			t4 = space();
    			div5 = element("div");
    			create_component(weightsection.$$.fragment);
    			t5 = space();
    			div6 = element("div");
    			create_component(listtarikh.$$.fragment);
    			attr_dev(div0, "class", "pl-2 text-center tracking-wide uppercase");
    			add_location(div0, file, 18, 6, 574);
    			attr_dev(button, "class", "bg-purple-600 hover:bg-purple-800 text-white py-0 px-4 rounded");
    			add_location(button, file, 22, 8, 693);
    			add_location(div1, file, 21, 6, 678);
    			attr_dev(div2, "class", "flex justify-between bg-purple-500 m-1 border-2 border-purple-500 rounded");
    			add_location(div2, file, 15, 4, 466);
    			attr_dev(div3, "class", "p-2 border-2 border-purple-500 rounded");
    			add_location(div3, file, 30, 4, 895);
    			attr_dev(div4, "class", "h-full bg-purple-300 m-2 shadow-2xl rounded-lg");
    			add_location(div4, file, 14, 2, 400);
    			attr_dev(div5, "class", "");
    			add_location(div5, file, 34, 2, 995);
    			attr_dev(div6, "class", "p-2 mt-2 bg-pink-200 border-2 border-purple-500 rounded mt-1");
    			add_location(div6, file, 37, 2, 1046);
    			attr_dev(main, "class", "flex justify-center sm:flex-row md:flex pt-6 px-2");
    			add_location(main, file, 13, 0, 332);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			mount_component(mycalendar, div3, null);
    			append_dev(main, t4);
    			append_dev(main, div5);
    			mount_component(weightsection, div5, null);
    			append_dev(main, t5);
    			append_dev(main, div6);
    			mount_component(listtarikh, div6, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClick*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(mycalendar.$$.fragment, local);
    			transition_in(weightsection.$$.fragment, local);
    			transition_in(listtarikh.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(mycalendar.$$.fragment, local);
    			transition_out(weightsection.$$.fragment, local);
    			transition_out(listtarikh.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(mycalendar);
    			destroy_component(weightsection);
    			destroy_component(listtarikh);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	function handleClick() {
    		resetvalue.update(value => value = !value);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		MyCalendar,
    		ListTarikh: LisTarikh,
    		resetvalue,
    		WeightSection: BMI,
    		handleClick
    	});

    	return [handleClick];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
