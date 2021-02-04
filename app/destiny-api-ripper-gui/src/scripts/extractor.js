function runTool(game, hashes) {
    // DestinyColladaGenerator.exe [<GAME>] [-o <OUTPUTPATH>] [<HASHES>]
    let commandArgs = [game, '-o', userPreferences.outputPath.value].concat(hashes);
    let child = execFile(userPreferences.toolPath.value, commandArgs, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
    });
    child.stdout.on('data', (data) => { console.log(`stdout: ${data}`) });
    child.stderr.on('data', (data) => { console.log(`stderr: ${data}`) });

    return child;
}

function runToolRecursive(game, itemHashes) {
    if (itemHashes.length > 0) {
        let child = runTool(game, [itemHashes.pop()]);
        child.on('exit', (code) => { runToolRecursive(game, itemHashes) });
    }
}

function execute(game, hashes) {
    // change DOM to reflect program state
    setVisibility($('#loading-indicator'), true);
    $('#queue-execute-button').attr('disabled', 'disabled');

    if (userPreferences.aggregateOutput.value) {
        let child = runTool(game, hashes);
        child.on('exit', (code) => {
            setVisibility($('#loading-indicator'), false);
            $('#queue-execute-button').removeAttr('disabled');
        });
    } else {
        runToolRecursive(game, hashes);
        setVisibility($('#loading-indicator'), false);
        $('#queue-execute-button').removeAttr('disabled');
    }
}

module.exports = execute;