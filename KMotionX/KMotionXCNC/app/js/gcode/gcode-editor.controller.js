(function() {

  angular.module('CodeEditor')
  .controller('GCodeEditorController', GCodeEditorController);  
  
  GCodeEditorController.$inject = ['$scope','$controller','GCodeRenderer','kmxBackend','settings','kmxThreeView']; 
  
  function GCodeEditorController($scope,$controller,GCodeRenderer,kmxBackend,settings,kmxThreeView){

    //Initialize the super class (EditorController) and extend it.
    angular.extend(this, $controller('EditorController', {$scope: $scope}));
    var vm = this;
    //override fileSelected from EditorController
    $scope.fileSelected = function(path){
      //will trigger a state-update event
      kmxBackend.loadGlobalFile(1, path);
    }
    var scrollInterval = null;
    var interpretLine = 0;
    vm.currentLine = -1;
    vm.editorLine = -1;
    //… Additional extensions to create a mixin.
    $scope.$on('state-update', function(event, args){
      var state = args.state;
      //interpretLine = state.line;
      //vm.currentLine = interpretLine;
      //Move cursor to line.
      /*
      if(state.interpreting){
        if(scrollInterval === null){
          scrollInterval = setInterval(updateEditor, 100);
        }
      } else {
        if(scrollInterval !== null){
          clearInterval(scrollInterval);
          scrollInterval = null;
          updateEditor();
        }
      }
      */
      //$scope.interpreting = state.interpreting;        

      if (state.file != "" && state.file != $scope.editorContentName ) {
        vm.openFile(state.file)
      }
      
      //only load if different from loaded
      //TODO or if file has been updated, need a force flag or date
      /*
      var lastLoaded = localStorage.getItem('last-loaded');
      if (obj.data.file != "" && obj.data.file != lastLoaded) {
          loadGCodeFromPath(obj.data.file);
      }
      */
    });
    
    $scope.$on('status-update', function statusUpdate(event, args){
      $scope.feedHold = args.status.stopImmediateState > 0;//pause
      $scope.interpreting = args.status.interpreting;    
      if(interpretLine != args.status.currentLine){
        vm.currentLine = interpretLine = args.status.currentLine;
        vm.editorLine = interpretLine + 1;
        updateEditor();
      }        
    });
    
    function updateEditor(){
      //$scope.aceEditor.moveCursorTo(interpretLine, 0);
      //$scope.aceEditor.gotoLine(interpretLine);
      $scope.aceEditor.selection.moveCursorToPosition({row: interpretLine, column: 0});
      $scope.aceEditor.scrollToLine(interpretLine, true, true, function () {});
      //$scope.aceEditor.selection.selectLine();

    }
    vm.onFeedhold = function(){
      kmxBackend.onFeedhold();     
    }  
    vm.onAbort = function(){
      kmxBackend.onAbort();     
    }    
    vm.onStep = function(){
      kmxBackend.onStep();     
    }
    vm.onReset = function(){
      kmxBackend.onReset();     
    }
    vm.onCycleStart = function(){
      //set motion params should done on backend
      //var BoardType = 2; //KLFOP
      //kmxBackend.interpret(BoardType, $scope.editorContentName, 0, -1, true);
      //TODO call either onHalt or onCycle start there to force WYSIWYG if browser has faulty state
      //kmxBackend.onHalt();
      kmxBackend.onCycleStart();
      /*
      var lastImported = localStorage.getItem('last-imported');
      var lastLoaded = localStorage.getItem('last-loaded');
      if (lastImported) {
        alert("Cannot interpret unsaved file.");
      } else {
        kmxBackend.interpret([2, lastLoaded, 0, -1, 1]);
      }
      */
    }
    
    //TODO Det här borde kunna göras i direktivet. Registrera en function som ska köras
    //när editorn ändras. editor.on('change') finns i direktive. Då slipper man en watch
    //This is great but not working very well on large(MB) files 
    $scope.$watch('editorContent', function (newVal, oldVal) {
      if (!newVal) return;
      //view3d is inheritet from app controller
      GCodeRenderer.renderGCode(new GCode.Source($scope.editorContent));
    });
    
    
    var machineBounds = null;
    
    $scope.$on('settings-update', function(event, args){
      if(machineBounds != null){
        kmxThreeView.scene.remove(machineBounds);
      }
      machineBounds = createMachineBounds();
      kmxThreeView.scene.add(machineBounds);
    });
    
    function createMachineBounds(){
      
      var x = settings.machine.dimX;
      var y = settings.machine.dimY;
      var z = settings.machine.dimZ;
      var mesh = new THREE.Mesh(new THREE.BoxGeometry( x, y, z ));
      mesh.matrixWorld.makeTranslation(x/2,y/2,z/2);
      var edges = new THREE.EdgesHelper(mesh, 0x0000ff );
      edges.material.linewidth = 1;
      return edges;
      
    }
    
  }

  

  
})();