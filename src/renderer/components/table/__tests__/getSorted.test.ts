/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { cloneDeep } from "lodash";
import { getSorted } from "../sorting";

describe("Table tests", () => {
  describe("getSorted", () => {
    it.each([undefined, 5, "", true, {}, []])("should not sort since %j is not a function", () => {
      expect(getSorted([1, 2, 4, 3], undefined, "asc")).toStrictEqual([1, 2, 4, 3]);
    });

    it("should sort numerically asc and not touch the original list", () => {
      const i = [1, 2, 4, 3];

      expect(getSorted(i, v => v, "asc")).toStrictEqual([1, 2, 3, 4]);
      expect(i).toStrictEqual([1, 2, 4, 3]);
    });

    it("should sort numerically desc and not touch the original list", () => {
      const i = [1, 2, 4, 3];

      expect(getSorted(i, v => v, "desc")).toStrictEqual([4, 3, 2, 1]);
      expect(i).toStrictEqual([1, 2, 4, 3]);
    });

    it("should sort numerically asc (by defaul) and not touch the original list", () => {
      const i = [1, 2, 4, 3];

      expect(getSorted(i, v => v, "foobar")).toStrictEqual([1, 2, 3, 4]);
      expect(i).toStrictEqual([1, 2, 4, 3]);
    });

    describe("multi-part", () => {
      it("should sort each part by its order", () => {
        const i = ["a", "c", "b.1", "b.2", "d"];

        expect(getSorted(i, v => v.split("."), "desc")).toStrictEqual(["d", "c", "b.2", "b.1", "a"]);
        expect(i).toStrictEqual(["a", "c", "b.1", "b.2", "d"]);
      });

      it("should be a stable sort", () => {
        const i = [{
          val: "a",
          k: 1,
        }, {
          val: "c",
          k: 2,
        }, {
          val: "b.1",
          k: 3,
        }, {
          val: "b.2",
          k: 4,
        }, {
          val: "d",
          k: 5,
        }, {
          val: "b.2",
          k: -10,
        }];
        const dup = cloneDeep(i);
        const expected = [
          {
            val: "a",
            k: 1,
          }, {
            val: "b.1",
            k: 3,
          }, {
            val: "b.2",
            k: 4,
          }, {
            val: "b.2",
            k: -10,
          }, {
            val: "c",
            k: 2,
          }, {
            val: "d",
            k: 5,
          },
        ];

        expect(getSorted(i, ({ val }) => val.split("."), "asc")).toStrictEqual(expected);
        expect(i).toStrictEqual(dup);
      });

      it("should be a stable sort #2", () => {
        const i = [{
          val: "a",
          k: 1,
        }, {
          val: "b.2",
          k: -10,
        }, {
          val: "c",
          k: 2,
        }, {
          val: "b.1",
          k: 3,
        }, {
          val: "b.2",
          k: 4,
        }, {
          val: "d",
          k: 5,
        }];
        const dup = cloneDeep(i);
        const expected = [
          {
            val: "a",
            k: 1,
          }, {
            val: "b.1",
            k: 3,
          }, {
            val: "b.2",
            k: -10,
          }, {
            val: "b.2",
            k: 4,
          }, {
            val: "c",
            k: 2,
          }, {
            val: "d",
            k: 5,
          },
        ];

        expect(getSorted(i, ({ val }) => val.split("."), "asc")).toStrictEqual(expected);
        expect(i).toStrictEqual(dup);
      });
    });
  });
});
