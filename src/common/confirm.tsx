// src/components/common/confirm.tsx
import React from "react";
import ReactDOM from "react-dom";
import ConfirmDialog from "./ConfirmDialog";

export function confirmDialog(
  message: string,
  opts: { confirmText?: string; cancelText?: string; danger?: boolean } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const handleClose = () => {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    };

    const handleConfirm = () => {
      resolve(true);
      handleClose();
    };
    const handleCancel = () => {
      resolve(false);
      handleClose();
    };

    ReactDOM.render(
      <ConfirmDialog
        message={message}
        confirmText={opts.confirmText}
        cancelText={opts.cancelText}
        danger={opts.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
      container
    );
  });
}
