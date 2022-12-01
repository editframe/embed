import { CompositionConfigEditor, LayerKey } from "@editframe/shared-types";

class Embed {
  public config: CompositionConfigEditor;
  private iFrame!: HTMLIFrameElement;
  private editframeLogo!: HTMLImageElement;
  private readyMediaIds: string[] = [];

  /**
   * Constructs a new instance of an Editframe embed.
   * @param configuration options
   */
  constructor({
    applicationId,
    config,
    containerId,
    dimensions,
    layers,
    mode,
    templateId,
  }: {
    applicationId: string;
    config: CompositionConfigEditor;
    containerId: string;
    dimensions?: {
      height: number;
      width: number;
    };
    layers?: LayerKey[];
    mode: "composition" | "template" | "preview";
    templateId?: string;
  }) {
    this.config = config;

    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }

    if (!["composition", "template", "preview"].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    container.style.alignItems = "center";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.height = dimensions ? `${dimensions.height}px` : "100%";
    container.style.width = dimensions ? `${dimensions.width}px` : "100%";

    const editframeLogo = document.createElement("img");
    editframeLogo.src =
      "https://www.editframe.com/docs/layer-configuration/position/editframe-logo.png";
    editframeLogo.style.position = "absolute";
    editframeLogo.style.transition = "opacity 0.5s";

    const iFrame = document.createElement("iframe");
    iFrame.setAttribute("loading", "lazy");
    iFrame.setAttribute(
      "src",
      `https://embed.editframe.test/${applicationId}?mode=${mode}${
        mode === "template" && templateId ? `&template=${templateId}` : ""
      }${
        layers
          ? `&layers=${layers.map((layer) => layer.toLowerCase()).join(",")}`
          : ""
      }`
    );
    iFrame.style.width = `${dimensions ? `${dimensions.width}px` : "100vw"}`;
    iFrame.style.height = `${dimensions ? `${dimensions.height}px` : "100vh"}`;
    iFrame.style.border = "none";
    iFrame.style.opacity = "0";
    iFrame.style.transition = "opacity 0.5s";

    container.appendChild(iFrame);
    container.appendChild(editframeLogo);

    window.addEventListener("message", async (event) => {
      if (event.data && event.data.config) {
        const {
          data: { config },
        } = event;

        this.config = config;
      }

      if (event.data && event.data.ready) {
        await this.handleIframeReady();
      }

      if (event.data && event.data.layerId) {
        const {
          data: { layerId },
        } = event;

        if (!this.readyMediaIds.includes(layerId)) {
          this.readyMediaIds.push(layerId);
        }
      }

      if (this.config) {
        const durationedMediaLayerIds = this.config.layers
          .filter((layer) => "source" in layer)
          .map((layer) => layer.id);
        if (
          durationedMediaLayerIds.every((layerId) =>
            this.readyMediaIds.includes(layerId)
          )
        ) {
          this.handleEditorReady();
        }
      }
    });

    this.iFrame = iFrame;
    this.editframeLogo = editframeLogo;
  }

  private handleIframeReady = async () => {
    if (this.config) {
      await this.sendCallWithValue("setConfig", this.config);
    }
  };

  private handleEditorReady = async () => {
    this.iFrame.style.opacity = "1";
    this.editframeLogo.style.opacity = "0";
    setTimeout(() => {
      this.editframeLogo.remove();
    }, 500);
  };

  private async sendCallWithValue(call: string, value: any): Promise<boolean> {
    if (!this.iFrame.contentWindow) return false;

    try {
      this.iFrame.contentWindow.postMessage(
        {
          call,
          value,
        },
        "*"
      );
      return true;
    } catch (err) {
      throw err;
    }
  }
}

export default Embed;
