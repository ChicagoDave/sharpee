#!/usr/bin/env ts-node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface EventCallInfo {
  eventType: string;
  dataProperties: ts.ObjectLiteralElementLike[];
  node: ts.CallExpression;
}

/**
 * Fix event structure in all migrated action files
 */
class EventStructureFixer {
  private changedFiles = 0;
  private totalChanges = 0;

  /**
   * Process all action files
   */
  async fixAllActions(): Promise<void> {
    console.log('🔍 Finding action files...');
    
    const pattern = path.join(
      process.cwd(),
      'packages/stdlib/src/actions/standard/**/*.ts'
    );
    
    const files = glob.sync(pattern, {
      ignore: ['**/*-events.ts', '**/index.ts']
    });

    console.log(`📁 Found ${files.length} action files to process`);

    for (const file of files) {
      await this.processFile(file);
    }

    console.log(`\n✅ Complete! Modified ${this.changedFiles} files with ${this.totalChanges} changes`);
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`\n📄 Processing ${fileName}...`);

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const transformer = this.createTransformer(fileName);
    const result = ts.transform(sourceFile, [transformer]);
    const transformedFile = result.transformed[0];

    if (result.transformed[0] !== sourceFile) {
      // Generate the new code
      const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
      });

      const newContent = printer.printFile(transformedFile as ts.SourceFile);
      
      // Write the file
      fs.writeFileSync(filePath, newContent);
      this.changedFiles++;
      console.log(`  ✓ Fixed ${fileName}`);
    } else {
      console.log(`  - No changes needed in ${fileName}`);
    }

    result.dispose();
  }

  /**
   * Create the transformer for fixing event structures
   */
  private createTransformer(fileName: string): ts.TransformerFactory<ts.Node> {
    let fileChangeCount = 0;

    return (context) => {
      const visit: ts.Visitor = (node) => {
        // Look for context.event() calls
        if (ts.isCallExpression(node) && this.isContextEventCall(node)) {
          const eventCall = this.parseEventCall(node);
          if (eventCall) {
            const fixed = this.fixEventCall(eventCall, context);
            if (fixed !== node) {
              fileChangeCount++;
              this.totalChanges++;
              return fixed;
            }
          }
        }

        return ts.visitEachChild(node, visit, context);
      };

      return (node) => {
        fileChangeCount = 0;
        const result = ts.visitNode(node, visit);
        if (fileChangeCount > 0) {
          console.log(`  → Made ${fileChangeCount} changes`);
        }
        return result;
      };
    };
  }

  /**
   * Check if a node is a context.event() call
   */
  private isContextEventCall(node: ts.CallExpression): boolean {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return false;
    }

    const propAccess = node.expression;
    return (
      ts.isIdentifier(propAccess.expression) &&
      propAccess.expression.text === 'context' &&
      propAccess.name.text === 'event'
    );
  }

  /**
   * Parse event call to extract type and data
   */
  private parseEventCall(node: ts.CallExpression): EventCallInfo | null {
    if (node.arguments.length < 2) return null;

    const eventTypeArg = node.arguments[0];
    if (!ts.isStringLiteral(eventTypeArg)) return null;

    const dataArg = node.arguments[1];
    if (!ts.isObjectLiteralExpression(dataArg)) return null;

    return {
      eventType: eventTypeArg.text,
      dataProperties: [...dataArg.properties],
      node
    };
  }

  /**
   * Fix the event call structure
   */
  private fixEventCall(
    eventCall: EventCallInfo,
    context: ts.TransformationContext
  ): ts.Node {
    const { eventType, dataProperties, node } = eventCall;

    // Fix event type
    let newEventType = eventType;
    if (eventType === 'if.event.error') {
      newEventType = 'action.error';
    } else if (eventType === 'if.event.success') {
      newEventType = 'action.success';
    } else {
      // Not an event we need to fix
      return node;
    }

    // Create new properties array
    const newProperties: ts.ObjectLiteralElementLike[] = [];

    // Add actionId if missing
    const hasActionId = dataProperties.some(
      prop => ts.isPropertyAssignment(prop) && 
      ts.isIdentifier(prop.name) && 
      prop.name.text === 'actionId'
    );

    if (!hasActionId) {
      newProperties.push(
        ts.factory.createPropertyAssignment(
          'actionId',
          ts.factory.createPropertyAccessExpression(
            ts.factory.createThis(),
            'id'
          )
        )
      );
    }

    // Process existing properties
    for (const prop of dataProperties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const propName = prop.name.text;

        // Skip if we already added actionId
        if (propName === 'actionId' && !hasActionId) {
          continue;
        }

        // Rename messageParams to params
        if (propName === 'messageParams') {
          newProperties.push(
            ts.factory.createPropertyAssignment('params', prop.initializer)
          );
          continue;
        }

        // For error events, add reason field if we have messageId
        if (newEventType === 'action.error' && propName === 'messageId') {
          newProperties.push(prop);
          
          // Check if reason already exists
          const hasReason = dataProperties.some(
            p => ts.isPropertyAssignment(p) && 
            ts.isIdentifier(p.name) && 
            p.name.text === 'reason'
          );

          if (!hasReason) {
            // Add reason field with same value as messageId
            newProperties.push(
              ts.factory.createPropertyAssignment('reason', prop.initializer)
            );
          }
          continue;
        }

        // Keep other properties as-is
        newProperties.push(prop);
      } else {
        // Keep spreads and other elements
        newProperties.push(prop);
      }
    }

    // Create the new call expression
    return ts.factory.createCallExpression(
      node.expression,
      undefined,
      [
        ts.factory.createStringLiteral(newEventType),
        ts.factory.createObjectLiteralExpression(newProperties, true)
      ]
    );
  }
}

// Run the fixer
async function main() {
  console.log('🚀 Starting event structure fix...\n');
  
  const fixer = new EventStructureFixer();
  
  try {
    await fixer.fixAllActions();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}