class Embed {
  private frame!: HTMLIFrameElement;

  /**
   * Constructs a new instance of an Editframe embed.
   * @param configuration options
   */
  constructor(id: string) {
    const iframes = document.querySelectorAll("iframe");
    const frame =
      Array.from(iframes).find((iframe) => iframe.id === id) || iframes[0];
    if (!frame) return;
    this.frame = frame;
  }

  public async setConfig(config: any): Promise<boolean> {
    return await this.sendCallWithValue("setConfig", config);
  }

  public async setTimeline(layers: any): Promise<boolean> {
    return await this.sendCallWithValue("setTimeline", layers);
  }

  private async sendCallWithValue(call: string, value: any): Promise<boolean> {
    if (!this.frame.contentWindow) return false;
    try {
      this.frame.contentWindow.postMessage(
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

