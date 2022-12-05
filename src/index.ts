import { CompositionConfigEditor, LayerKey } from "@editframe/shared-types";
import { v4 as uuid } from "uuid";

class Embed {
  public applicationId?: string;
  public config: CompositionConfigEditor;
  public container: HTMLElement | null;
  public dimensions?: { height: string; width: string };
  public iFrameId: string;
  public layers?: LayerKey[];
  public mode: string;
  public templateName?: string;
  private editframeLogo!: HTMLImageElement;
  private iFrame!: HTMLIFrameElement;
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
    templateName,
  }: {
    applicationId?: string;
    config: CompositionConfigEditor;
    containerId: string;
    dimensions?: {
      height: string;
      width: string;
    };
    layers?: LayerKey[];
    mode: "composition" | "template" | "preview";
    templateName?: string;
  }) {
    this.applicationId = applicationId;
    this.config = config;
    this.container = document.getElementById(containerId);
    this.dimensions = dimensions;
    this.iFrameId = uuid().slice(0, 6);
    this.layers = layers;
    this.mode = mode;
    this.templateName = templateName;

    if (!this.container) {
      throw new Error(`Container #${containerId} not found`);
    }

    if (!["composition", "template", "preview"].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    this.setupContainer(this.container);
    this.setupEditframeLogo();
    this.setupIFrame();
    this.setupEventListeners();
  }

  private setupContainer = (container: HTMLElement) => {
    container.style.alignItems = "center";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.height = "100%";
    container.style.width = "100%";
  };

  private setupEditframeLogo = () => {
    const editframeLogo = document.createElement("img");
    editframeLogo.src =
      "https://www.editframe.com/docs/layer-configuration/position/editframe-logo.png";
    editframeLogo.style.position = "absolute";
    editframeLogo.style.transition = "opacity 0.5s";
    this.container?.appendChild(editframeLogo);
    this.editframeLogo = editframeLogo;

    return editframeLogo;
  };

  private setupIFrame = () => {
    const iFrame = document.createElement("iframe");
    const baseEmbedUrl =
      process.env.NODE_ENV === "production"
        ? "https://embed.editframe.com"
        : "https://embed.editframe.test";
    iFrame.setAttribute("loading", "lazy");
    iFrame.setAttribute(
      "src",
      `${baseEmbedUrl}${
        this.applicationId ? `/${this.applicationId}` : ""
      }?mode=${this.mode}${
        this.mode === "template" && this.templateName
          ? `&templateName=${this.templateName}`
          : ""
      }${
        this.layers
          ? `&layers=${this.layers
              .map((layer) => layer.toLowerCase())
              .join(",")}`
          : ""
      }`
    );
    iFrame.style.width = this.dimensions?.width || "100vw";
    iFrame.style.height = this.dimensions?.height || "100vh";
    iFrame.style.opacity = "0";
    iFrame.style.border = "none";
    iFrame.style.outline = "none";
    iFrame.style.transition = "opacity 0.5s";
    this.container?.appendChild(iFrame);
    this.iFrame = iFrame;

    return iFrame;
  };

  private setupEventListeners = () => {
    window.addEventListener("message", async (event) => {
      if (
        event.data &&
        event.data.config &&
        event.data.iFrameId === this.iFrameId
      ) {
        const {
          data: { config },
        } = event;

        this.config = config;
      }

      if (event.data && event.data.pageLoaded) {
        await this.handlePageLoaded();
      }

      if (
        event.data &&
        event.data.iFrameId &&
        event.data.iFrameId !== this.iFrameId
      ) {
        return;
      }

      if (event.data && event.data.iFrameReady) {
        await this.handleIframeReady();
      }

      if (event.data && event.data.editorReady) {
        await this.handleEditorReady();
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
        const allMediaReady = durationedMediaLayerIds.every((layerId) =>
          this.readyMediaIds.includes(layerId)
        );

        if (this.config.layers.length === 0 || allMediaReady) {
          this.handleEditorReady();
        }
      }
    });
  };

  private handlePageLoaded = async () => {
    await this.sendCallWithValue("setIframeId", {
      iFrameId: this.iFrameId,
    });
  };

  private handleIframeReady = async () => {
    if (this.config) {
      await this.sendCallWithValue("setConfig", {
        config: this.config,
        iFrameId: this.iFrameId,
      });
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
