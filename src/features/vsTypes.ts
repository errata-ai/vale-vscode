/**
 * A severity from Vale Server.
 */
type ValeSeverity = "suggestion" | "warning" | "error";

interface IEditorContext {
  Content: string;
  Offset: number;
}

/**
 * An Action From Vale.
 */
interface IValeActionJSON {
  readonly Name: string;
  readonly Params: [string];
}

/**
 * A CLI Config interface for pattern, config pairs From Vale.
 */
interface IValeCLIConfig {
  readonly pattern: string;
  readonly config: string;
}

/**
 * An Alert From Vale.
 */
interface IValeErrorJSON {
  readonly Action: IValeActionJSON;
  readonly Check: string;
  readonly Match: string;
  readonly Description: string;
  readonly Line: number;
  readonly Link: string;
  readonly Message: string;
  readonly Span: [number, number];
  readonly Severity: ValeSeverity;
}
