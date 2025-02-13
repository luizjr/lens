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

import React from "react";
import { boundMethod, cssNames } from "../../utils";
import type { KubeObject } from "../../../common/k8s-api/kube-object";
import { MenuActions, MenuActionsProps } from "../menu";
import identity from "lodash/identity";
import type { ApiManager } from "../../../common/k8s-api/api-manager";

export interface KubeObjectMenuDependencies<TKubeObject> {
  apiManager: ApiManager;
  kubeObjectMenuItems: React.ElementType[];
  clusterName: string;
  hideDetails: () => void;
  editResourceTab: (kubeObject: TKubeObject) => void;
}

export interface KubeObjectMenuProps<TKubeObject> extends MenuActionsProps {
  object: TKubeObject | null | undefined;
  editable?: boolean;
  removable?: boolean;
}

export interface KubeObjectMenuPropsAndDependencies<TKubeObject>
  extends KubeObjectMenuProps<TKubeObject>,
    KubeObjectMenuDependencies<TKubeObject> {}

export class KubeObjectMenu<
  TKubeObject extends KubeObject,
> extends React.Component<KubeObjectMenuPropsAndDependencies<TKubeObject>> {
  get store() {
    const { object } = this.props;

    if (!object) return null;

    return this.props.apiManager.getStore(object.selfLink);
  }

  get isEditable() {
    return this.props.editable ?? Boolean(this.store?.patch);
  }

  get isRemovable() {
    return this.props.removable ?? Boolean(this.store?.remove);
  }

  @boundMethod
  async update() {
    this.props.hideDetails();
    this.props.editResourceTab(this.props.object);
  }

  @boundMethod
  async remove() {
    this.props.hideDetails();
    const { object, removeAction } = this.props;

    if (removeAction) await removeAction();
    else await this.store.remove(object);
  }

  @boundMethod
  renderRemoveMessage() {
    const { object } = this.props;

    if (!object) {
      return null;
    }

    const breadcrumbParts = [object.getNs(), object.getName()];

    const breadcrumb = breadcrumbParts.filter(identity).join("/");

    return (
      <p>
        Remove {object.kind} <b>{breadcrumb}</b> from <b>{this.props.clusterName}</b>?
      </p>
    );
  }

  getMenuItems(): React.ReactChild[] {
    const { object, toolbar } = this.props;

    return this.props.kubeObjectMenuItems.map((MenuItem, index) => (
      <MenuItem
        object={object}
        toolbar={toolbar}
        key={`menu-item-${index}`}
      />
    ));
  }

  render() {
    const { remove, update, renderRemoveMessage, isEditable, isRemovable } = this;
    const { className, editable, removable, ...menuProps } = this.props;

    return (
      <MenuActions
        className={cssNames("KubeObjectMenu", className)}
        updateAction={isEditable ? update : undefined}
        removeAction={isRemovable ? remove : undefined}
        removeConfirmationMessage={renderRemoveMessage}
        {...menuProps}
      >
        {this.getMenuItems()}
      </MenuActions>
    );
  }
}
