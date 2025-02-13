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

import { KubeObject, LabelSelector } from "../kube-object";
import { autoBind } from "../../utils";
import { KubeApi } from "../kube-api";
import type { KubeJsonApiData } from "../kube-json-api";
import { isClusterPageContext } from "../../utils/cluster-id-url-parsing";

export interface IPolicyIpBlock {
  cidr: string;
  except?: string[];
}

/**
 * @deprecated Use `LabelSelector` instead
 */
export type IPolicySelector = LabelSelector;

export interface NetworkPolicyPort {
  /**
   * The protocol which network traffic must match.
   *
   * One of:
   * - `"TCP"`
   * - `"UDP"`
   * - `"SCTP"`
   *
   * @default "TCP"
   */
  protocol?: string;

  /**
   * The port on the given protocol. This can either be a numerical or named
   * port on a pod. If this field is not provided, this matches all port names and
   * numbers.
   *
   * If present, only traffic on the specified protocol AND port will be matched.
   */
  port?: number | string;

  /**
   * If set, indicates that the range of ports from port to endPort, inclusive,
   * should be allowed by the policy. This field cannot be defined if the port field
   * is not defined or if the port field is defined as a named (string) port.
   *
   * The endPort must be equal or greater than port.
   */
  endPort?: number;
}

export interface NetworkPolicyPeer {
  /**
   * IPBlock defines policy on a particular IPBlock. If this field is set then
   * neither of the other fields can be.
   */
  ipBlock?: IPolicyIpBlock;

  /**
   * Selects Namespaces using cluster-scoped labels. This field follows standard label
   * selector semantics; if present but empty, it selects all namespaces.
   *
   * If PodSelector is also set, then the NetworkPolicyPeer as a whole selects
   * the Pods matching PodSelector in the Namespaces selected by NamespaceSelector.
   *
   * Otherwise it selects all Pods in the Namespaces selected by NamespaceSelector.
   */
  namespaceSelector?: LabelSelector;

  /**
   * This is a label selector which selects Pods. This field follows standard label
   * selector semantics; if present but empty, it selects all pods.
   *
   * If NamespaceSelector is also set, then the NetworkPolicyPeer as a whole selects
   * the Pods matching PodSelector in the Namespaces selected by NamespaceSelector.
   *
   * Otherwise it selects the Pods matching PodSelector in the policy's own Namespace.
   */
  podSelector?: LabelSelector;
}

export interface IPolicyIngress {
  from?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface IPolicyEgress {
  to?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export type PolicyType = "Ingress" | "Egress";

export interface NetworkPolicySpec {
  podSelector: LabelSelector;
  policyTypes?: PolicyType[];
  ingress?: IPolicyIngress[];
  egress?: IPolicyEgress[];
}

export interface NetworkPolicy {
  spec: NetworkPolicySpec;
}

export class NetworkPolicy extends KubeObject {
  static kind = "NetworkPolicy";
  static namespaced = true;
  static apiBase = "/apis/networking.k8s.io/v1/networkpolicies";

  constructor(data: KubeJsonApiData) {
    super(data);
    autoBind(this);
  }

  getMatchLabels(): string[] {
    if (!this.spec.podSelector || !this.spec.podSelector.matchLabels) return [];

    return Object
      .entries(this.spec.podSelector.matchLabels)
      .map(data => data.join(":"));
  }

  getTypes(): string[] {
    if (!this.spec.policyTypes) return [];

    return this.spec.policyTypes;
  }
}

let networkPolicyApi: KubeApi<NetworkPolicy>;

if (isClusterPageContext()) {
  networkPolicyApi = new KubeApi<NetworkPolicy>({
    objectConstructor: NetworkPolicy,
  });
}

export {
  networkPolicyApi,
};
