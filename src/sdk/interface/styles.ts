export default class Styles {
  static getOverrides() {
    return `
        .uranus-toolbar.active{
            color: #b1b8ba;
            background-color: #20292b;
            box-shadow: 0 0 8px rgba(0,0,0,0.5);
        }
        .uranus-list{
            box-shadow: none !important;
            width: 140px !important;
        }
        .uranus-list-item{
            cursor: default;
        }
        .uranus-checkbox{
            float: right;
            margin-top: 9px;
            line-height: 33px !important;
        }
        .uranus-button{
            cursor: pointer;
        }
        .uranus-messages{
            position: absolute;
            top: 0px;
            left: 110%;
            width: max-content;
            color: rgba(255,255,255,0.75);
            text-shadow: 0px 0px 1px rgba(0,0,0,0.3);        
        }
        `;
  }
}
